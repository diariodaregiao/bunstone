import {
	context as otelContext,
	metrics as otelMetrics,
	SpanStatusCode,
	trace,
} from "@opentelemetry/api";
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
		const handler = this.getHandler(commandType);
		if (!handler) {
			throw CqrsError.noCommandHandler(commandType.name);
		}

		const commandName = commandType.name;
		const tracer = trace.getTracer("bunstone.cqrs");
		const span = tracer.startSpan(`command.execute ${commandName}`, {
			attributes: {
				"cqrs.type": "command",
				"cqrs.command.name": commandName,
			},
		});

		const start = performance.now();
		return otelContext.with(
			trace.setSpan(otelContext.active(), span),
			async () => {
				try {
					const result = await handler.execute(command);
					span.setStatus({ code: SpanStatusCode.OK });
					return result;
				} catch (err: any) {
					span.recordException(err);
					span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
					throw err;
				} finally {
					span.end();
					try {
						otelMetrics
							.getMeter("bunstone")
							.createHistogram("cqrs.command.duration", {
								description: "Duration of CQRS command execution",
								unit: "ms",
							})
							.record(performance.now() - start, {
								"cqrs.command.name": commandName,
							});
					} catch {
						// best-effort
					}
				}
			},
		);
	}

	private getHandler(commandType: any): ICommandHandler | undefined {
		const exactHandler = this.handlers.get(commandType);
		if (exactHandler) {
			return exactHandler;
		}

		if (typeof commandType !== "function" || !commandType.name) {
			return undefined;
		}

		let matchedHandler: ICommandHandler | undefined;
		for (const [registeredType, handler] of this.handlers.entries()) {
			if (
				typeof registeredType === "function" &&
				registeredType.name === commandType.name
			) {
				matchedHandler = handler;
			}
		}

		return matchedHandler;
	}
}
