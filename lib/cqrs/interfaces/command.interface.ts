export interface ICommand {}

export interface ICommandHandler<T extends ICommand = any, R = any> {
  execute(command: T): Promise<R>;
}
