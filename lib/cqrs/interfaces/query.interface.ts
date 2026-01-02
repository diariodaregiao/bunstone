export interface IQuery {}

export interface IQueryHandler<T extends IQuery = any, R = any> {
  execute(query: T): Promise<R>;
}
