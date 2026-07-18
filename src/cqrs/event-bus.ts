import type { Constructor } from "@/core/injectable";
import { Injectable } from "@/core/injectable";
import { Logger } from "@/utils/logger";
import type { IEventHandler } from "./interfaces";

@Injectable()
export class EventBus {
	private readonly handlers = new Map<Constructor, IEventHandler[]>();
	private readonly logger = new Logger("EventBus");

	register(event: Constructor, handler: IEventHandler): void {
		const list = this.handlers.get(event) ?? [];
		list.push(handler);
		this.handlers.set(event, list);
	}

	publish(event: object): void {
		void this.publishAndWait(event);
	}

	async publishAndWait(event: object): Promise<void> {
		const handlers = this.handlers.get(event.constructor as Constructor) ?? [];
		await Promise.all(handlers.map((handler) => this.dispatch(event, handler)));
	}

	private async dispatch(event: object, handler: IEventHandler): Promise<void> {
		try {
			await handler.handle(event);
		} catch (error) {
			this.logger.error(
				`Event handler failed for "${event.constructor.name}":`,
				error,
			);
		}
	}
}
