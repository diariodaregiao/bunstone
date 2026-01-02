import "reflect-metadata";

export const COMMAND_HANDLER_METADATA = "dip:cqrs:command-handler";

export const CommandHandler = (command: any): ClassDecorator => {
  return (target: object) => {
    Reflect.defineMetadata(COMMAND_HANDLER_METADATA, command, target);
  };
};
