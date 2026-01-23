import { CqrsError } from "../errors";
import { Injectable } from "../injectable";
import { COMMAND_HANDLER_METADATA } from "./decorators/command-handler.decorator";
import type { ICommand, ICommandHandler } from "./interfaces/command.interface";

/**
 * Bus for dispatching commands to their respective handlers.
 */
@Injectable()
export class CommandBus {
	private handlers = new Map<any, ICommandHandler>();

	/**
	 * Registers a list of command handlers.
	 * @param handlers Array of command handler instances.
	 */
	register(handlers: ICommandHandler[]) {
		handlers.forEach((handler) => {
			const command = Reflect.getMetadata(
				COMMAND_HANDLER_METADATA,
				handler.constructor,
			);
			if (command) {
				this.handlers.set(command, handler);
			}
		});
	}

	/**
	 * Executes a command and returns the result.
	 * @param command The command instance to execute.
	 * @returns The result of the command execution.
	 * @throws CqrsError if no handler is found for the command.
	 */
	async execute<T extends ICommand, R = any>(command: T): Promise<R> {
		const commandType = command.constructor;
		const handler = this.handlers.get(commandType);
		if (!handler) {
			throw new CqrsError(
				`No handler found for command: ${commandType.name}`,
				`Ensure that a handler for ${commandType.name} is registered in your module's providers and decorated with @CommandHandler(${commandType.name}).`,
			);
		}
		return handler.execute(command);
	}
}
