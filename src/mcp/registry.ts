import type { Container } from "@/core/container";
import {
	FRAMEWORK_WIRING,
	FRAMEWORK_WIRING_ORDER,
	type FrameworkWiring,
	type WiringContext,
} from "@/core/lifecycle";
import type { Constructor } from "@/core/injectable";
import { McpError } from "@/errors";
import { ForbiddenException } from "@/http/exceptions";
import { getControllerGuards, getRouteGuards } from "@/http/guard";
import { getMcpPrimitives } from "./decorators";
import type {
	McpContext,
	McpGuard,
	McpHandler,
	McpModuleOptions,
	McpPrimitiveMetadata,
	McpPrimitives,
	McpPromptEntry,
	McpResourceEntry,
	McpResourceTemplateEntry,
	McpToolEntry,
} from "./types";
import {
	assertName,
	assertScopes,
	assertToolName,
	prepareSchema,
} from "./validation";

/**
 * The application's tools, resources and prompts, found once at startup on
 * the providers (of the `include` modules, or of every module), each method
 * wrapped with its guards. The servers built per request or per connection
 * register these.
 */
export class McpRegistry implements McpPrimitives, FrameworkWiring {
	readonly tools: McpToolEntry[] = [];
	readonly resources: McpResourceEntry[] = [];
	readonly resourceTemplates: McpResourceTemplateEntry[] = [];
	readonly prompts: McpPromptEntry[] = [];
	private scanned = false;

	constructor(private readonly options: McpModuleOptions) {}

	/** Started by the core during bootstrap, after RabbitMQ; see `wireMcp`. */
	readonly [FRAMEWORK_WIRING_ORDER] = 20;

	async [FRAMEWORK_WIRING]({
		container,
		instances,
	}: WiringContext): Promise<void> {
		const { wireMcp } = await import("./mcp-module");
		await wireMcp(container, instances);
	}

	get size(): number {
		return (
			this.tools.length +
			this.resources.length +
			this.resourceTemplates.length +
			this.prompts.length
		);
	}

	scan(container: Container, instances: readonly unknown[]): void {
		if (this.scanned) return;
		this.scanned = true;

		const include = this.options.include
			? new Set<Constructor>(this.options.include)
			: undefined;
		for (const instance of instances) {
			if (!instance || typeof instance !== "object") continue;
			const ctor = instance.constructor as Constructor;
			if (typeof ctor !== "function") continue;
			const primitives = getMcpPrimitives(ctor);
			if (primitives.length === 0) continue;
			const owner = container.ownerOf(ctor);
			if (include && (!owner || !include.has(owner))) continue;

			for (const metadata of primitives) {
				const method = (instance as Record<string, unknown>)[
					metadata.methodName
				];
				const where = `${ctor.name}.${metadata.methodName}`;
				if (typeof method !== "function") continue;
				const handler = wrap(
					container,
					owner,
					instance,
					ctor,
					metadata.methodName,
					method as (...args: unknown[]) => unknown,
				);
				this.add(metadata, where, handler);
			}
		}
		this.assertScopesAreEnforced();
	}

	private add(
		metadata: McpPrimitiveMetadata,
		where: string,
		handler: McpHandler,
	): void {
		assertScopes(metadata.options.scopes, where);
		const fallbackName = metadata.methodName;
		switch (metadata.kind) {
			case "tool": {
				const { options } = metadata;
				const name = assertToolName(options.name ?? fallbackName, where);
				this.assertUnique(this.tools, name, where, "tool");
				this.tools.push({
					name,
					options,
					handler,
					where,
					inputSchema:
						options.inputSchema &&
						prepareSchema(options.inputSchema, `${where} inputSchema`, "input"),
					outputSchema:
						options.outputSchema &&
						prepareSchema(
							options.outputSchema,
							`${where} outputSchema`,
							"output",
						),
				});
				return;
			}
			case "resource": {
				const { options } = metadata;
				const name = assertName(
					options.name ?? fallbackName,
					where,
					"resource",
				);
				const uri = new URL(options.uri).href;
				const existing = this.resources.find((entry) => entry.uri === uri);
				if (existing) {
					throw McpError.duplicate(
						where,
						`resource at "${uri}"`,
						existing.where,
					);
				}
				this.resources.push({ name, options, handler, where, uri });
				return;
			}
			case "resource-template": {
				const { options } = metadata;
				const name = assertName(
					options.name ?? fallbackName,
					where,
					"resource template",
				);
				this.assertUnique(
					this.resourceTemplates,
					name,
					where,
					"resource template",
				);
				const existing = this.resourceTemplates.find(
					(entry) => entry.uriTemplate === options.uriTemplate,
				);
				if (existing) {
					throw McpError.duplicate(
						where,
						`resource template for "${options.uriTemplate}"`,
						existing.where,
					);
				}
				this.resourceTemplates.push({
					name,
					options,
					handler,
					where,
					uriTemplate: options.uriTemplate,
				});
				return;
			}
			case "prompt": {
				const { options } = metadata;
				const name = assertName(options.name ?? fallbackName, where, "prompt");
				this.assertUnique(this.prompts, name, where, "prompt");
				this.prompts.push({
					name,
					options,
					handler,
					where,
					argsSchema:
						options.argsSchema &&
						prepareSchema(options.argsSchema, `${where} argsSchema`, "input"),
				});
				return;
			}
		}
	}

	private assertUnique(
		entries: { name: string; where: string }[],
		name: string,
		where: string,
		what: string,
	): void {
		const existing = entries.find((entry) => entry.name === name);
		if (existing) {
			throw McpError.duplicate(
				where,
				`${what} named "${name}"`,
				existing.where,
			);
		}
	}

	/**
	 * The SDK checks `scopes` only against a verified token and lets a request
	 * without one through, so scopes on an HTTP endpoint without `auth` would
	 * protect nothing.
	 */
	private assertScopesAreEnforced(): void {
		if (this.options.auth || this.options.path === false) return;
		const scoped = [
			...this.tools,
			...this.resources,
			...this.resourceTemplates,
			...this.prompts,
		].find((entry) => entry.options.scopes);
		if (scoped) throw McpError.scopesWithoutAuth(scoped.where);
	}
}

/**
 * The method behind its guards: the class's `@UseGuards()` first, then the
 * method's, each resolved in the provider's own module so strict module
 * boundaries apply as they do to HTTP guards.
 */
function wrap(
	container: Container,
	owner: Constructor | undefined,
	instance: object,
	ctor: Constructor,
	methodName: string,
	method: (...args: unknown[]) => unknown,
): McpHandler {
	const guards = [
		...getControllerGuards(ctor),
		...getRouteGuards(ctor, methodName),
	] as unknown as Constructor<McpGuard>[];

	return async (input: unknown, ctx: McpContext) => {
		for (const Guard of guards) {
			const guard = container.resolve(Guard, owner);
			if (!(await guard.canActivate(ctx))) throw new ForbiddenException();
		}
		return method.call(instance, input, ctx);
	};
}
