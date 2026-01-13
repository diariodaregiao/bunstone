import "reflect-metadata";

export const COMMAND_HANDLER_METADATA = "dip:cqrs:command-handler";

/**
 * Decorator that marks a class as a command handler.
 * @param command The command class that this handler handles.
 */
export const CommandHandler = (command: any): any => {
  return (target: object, _context?: any) => {
    Reflect.defineMetadata(COMMAND_HANDLER_METADATA, command, target);
  };
};
