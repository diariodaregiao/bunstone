import type { Container } from "@/core/container";
import type { Constructor } from "@/core/injectable";
import type { DynamicModule } from "@/core/module";
import { CommandBus } from "./command-bus";
import {
	getCommandHandlerTarget,
	getEventHandlerTarget,
	getQueryHandlerTarget,
} from "./decorators";
import { EventBus } from "./event-bus";
import { QueryBus } from "./query-bus";

export class CqrsModule {
	static register(): DynamicModule {
		return {
			module: CqrsModule,
			global: true,
			providers: [CommandBus, QueryBus, EventBus],
		};
	}
}

export function wireCqrs(
	container: Container,
	instances: readonly unknown[],
): void {
	if (!container.has(CommandBus)) return;

	const commandBus = container.resolve(CommandBus);
	const queryBus = container.resolve(QueryBus);
	const eventBus = container.resolve(EventBus);

	for (const instance of instances) {
		const ctor = (instance as { constructor?: Constructor })?.constructor;
		if (typeof ctor !== "function") continue;

		const command = getCommandHandlerTarget(ctor);
		if (command) commandBus.register(command, instance as never);

		const query = getQueryHandlerTarget(ctor);
		if (query) queryBus.register(query, instance as never);

		const event = getEventHandlerTarget(ctor);
		if (event) eventBus.register(event, instance as never);
	}
}
