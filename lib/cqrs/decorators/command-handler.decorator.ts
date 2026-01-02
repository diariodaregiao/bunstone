import "reflect-metadata";

export const COMMAND_HANDLER_METADATA = "dip:cqrs:command-handler";

/**
 * Decorator that marks a class as a command handler.
 * @param command The command class that this handler handles.
 */
export const CommandHandler = (command: any): ClassDecorator => {
  return (target: object) => {
    Reflect.defineMetadata(COMMAND_HANDLER_METADATA, command, target);
  };
};
