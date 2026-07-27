import type { Constructor } from "@/core/injectable";
import { Injectable } from "@/core/injectable";
import { CqrsError } from "@/errors";
import { instrumentDispatch } from "@/observability/instrumentation";
import type { ICommandHandler } from "./interfaces";

@Injectable()
export class CommandBus {
	private readonly handlers = new Map<Constructor, ICommandHandler>();

	register(command: Constructor, handler: ICommandHandler): void {
		this.handlers.set(command, handler);
	}

	async execute<TResult = unknown>(command: object): Promise<TResult> {
		const handler = this.handlers.get(command.constructor as Constructor);
		if (!handler) {
			throw CqrsError.noCommandHandler(command.constructor.name);
		}
		return instrumentDispatch(
			"command",
			command.constructor.name,
			async () => (await handler.execute(command)) as TResult,
		);
	}
}
