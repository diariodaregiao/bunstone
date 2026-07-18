export type IEvent = {};

export interface IEventHandler<T extends IEvent = any> {
	handle(event: T): any;
}
