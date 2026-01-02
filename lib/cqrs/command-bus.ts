import { Injectable } from "../injectable";
import { COMMAND_HANDLER_METADATA } from "./decorators/command-handler.decorator";
import type { ICommand, ICommandHandler } from "./interfaces/command.interface";

@Injectable()
export class CommandBus {
  private handlers = new Map<any, ICommandHandler>();

  register(handlers: ICommandHandler[]) {
    handlers.forEach((handler) => {
      const command = Reflect.getMetadata(COMMAND_HANDLER_METADATA, handler.constructor);
      if (command) {
        this.handlers.set(command, handler);
      }
    });
  }

  async execute<T extends ICommand, R = any>(command: T): Promise<R> {
    const commandType = command.constructor;
    const handler = this.handlers.get(commandType);
    if (!handler) {
      throw new Error(`No handler found for command: ${commandType.name}`);
    }
    return handler.execute(command);
  }
}
