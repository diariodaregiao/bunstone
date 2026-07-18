import "reflect-metadata";
import { DependencyResolutionError } from "../errors";
import {
	type Constructor,
	INJECT_TOKENS_METADATA,
	type Token,
	tokenName,
} from "./injectable";

/**
 * A provider tells the container how to produce the value for a token.
 *
 * - `Class` — shorthand for `{ provide: Class, useClass: Class }`
 * - `{ provide, useValue }` — a ready-made value
 * - `{ provide, useClass }` — construct a (possibly different) class
 * - `{ provide, useFactory, inject }` — call a factory with resolved deps
 */
export type Provider<T = any> =
	| Constructor<T>
	| { provide: Token<T>; useValue: T }
	| { provide: Token<T>; useClass: Constructor<T> }
	| {
			provide: Token<T>;
			useFactory: (...deps: any[]) => T;
			inject?: Token[];
	  };

type NormalizedProvider =
	| { provide: Token; useValue: unknown }
	| { provide: Token; useClass: Constructor }
	| {
			provide: Token;
			useFactory: (...deps: unknown[]) => unknown;
			inject: Token[];
	  };

/**
 * A dependency-injection container.
 *
 * Instance-based (no global state), singleton-scoped, with cycle detection.
 * Every {@link Application} owns exactly one, so multiple apps in the same
 * process — including tests — never share state.
 */
export class Container {
	private readonly providers = new Map<Token, NormalizedProvider>();
	private readonly instances = new Map<Token, unknown>();
	private readonly resolving: Token[] = [];

	/** Registers a provider. Later registrations for the same token win. */
	register(provider: Provider): void {
		const normalized = normalize(provider);
		this.providers.set(normalized.provide, normalized);
	}

	/** Registers an already-built value and caches it as the singleton. */
	registerValue<T>(token: Token<T>, value: T): void {
		this.providers.set(token, { provide: token, useValue: value });
		this.instances.set(token, value);
	}

	/** True when a provider or instance exists for `token`. */
	has(token: Token): boolean {
		return this.providers.has(token) || this.instances.has(token);
	}

	/** Resolves the singleton for `token`, constructing it on first access. */
	resolve<T>(token: Token<T>): T {
		const cached = this.instances.get(token);
		if (cached !== undefined || this.instances.has(token)) {
			return cached as T;
		}

		const provider = this.providers.get(token);
		if (!provider) {
			throw DependencyResolutionError.notRegistered(
				tokenName(token),
				this.chain(token),
			);
		}

		if (this.resolving.includes(token)) {
			throw DependencyResolutionError.circular(this.chain(token));
		}

		this.resolving.push(token);
		try {
			const instance = this.instantiate(provider);
			this.instances.set(token, instance);
			return instance as T;
		} finally {
			this.resolving.pop();
		}
	}

	/** Eagerly resolves every registered provider (forces singleton creation). */
	instantiateAll(): void {
		for (const token of this.providers.keys()) {
			this.resolve(token);
		}
	}

	/** All distinct instances created so far, in creation order. */
	getInstances(): unknown[] {
		return [...new Set(this.instances.values())];
	}

	private instantiate(provider: NormalizedProvider): unknown {
		if ("useValue" in provider) return provider.useValue;
		if ("useFactory" in provider) {
			const deps = provider.inject.map((token) => this.resolve(token));
			return provider.useFactory(...deps);
		}
		return this.construct(provider.useClass);
	}

	private construct(cls: Constructor): unknown {
		const paramTypes: unknown[] =
			Reflect.getMetadata("design:paramtypes", cls) ?? [];

		if (paramTypes.length === 0 && cls.length > 0) {
			throw DependencyResolutionError.generic(
				`Class \`${cls.name}\` has constructor parameters but no decorator metadata was emitted.`,
				{ class: cls.name },
			);
		}

		const overrides: Map<number, Token> | undefined = Reflect.getOwnMetadata(
			INJECT_TOKENS_METADATA,
			cls,
		);

		const args = paramTypes.map((paramType, index) => {
			const token = overrides?.get(index) ?? (paramType as Token);
			if (token === undefined || token === null) {
				throw DependencyResolutionError.undefinedType(this.chain(cls));
			}
			if ((token as unknown) === Object) {
				throw DependencyResolutionError.objectType(this.chain(cls));
			}
			return this.resolve(token);
		});

		return new cls(...args);
	}

	private chain(token: Token): string {
		return [...this.resolving, token].map(tokenName).join(" -> ");
	}
}

function normalize(provider: Provider): NormalizedProvider {
	if (typeof provider === "function") {
		return { provide: provider, useClass: provider };
	}
	if ("useValue" in provider) {
		return { provide: provider.provide, useValue: provider.useValue };
	}
	if ("useClass" in provider) {
		return { provide: provider.provide, useClass: provider.useClass };
	}
	return {
		provide: provider.provide,
		useFactory: provider.useFactory,
		inject: provider.inject ?? [],
	};
}
