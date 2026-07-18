import "reflect-metadata";
import type { Constructor } from "@/core/injectable";

export const RABBIT_CONSUMER_METADATA = "bunstone:rabbit-consumer";
export const RABBIT_SUBSCRIBE_METADATA = "bunstone:rabbit-subscribe";

export interface SubscribeConfig {
	queue: string;
	methodName: string;
}

export function RabbitConsumer(): ClassDecorator {
	return (target) => {
		Reflect.defineMetadata(RABBIT_CONSUMER_METADATA, true, target);
	};
}

export function RabbitSubscribe(config: { queue: string }): MethodDecorator {
	return (target, propertyKey) => {
		const ctor = (target as { constructor: Constructor }).constructor;
		const subs: SubscribeConfig[] =
			Reflect.getOwnMetadata(RABBIT_SUBSCRIBE_METADATA, ctor) ?? [];
		subs.push({ queue: config.queue, methodName: String(propertyKey) });
		Reflect.defineMetadata(RABBIT_SUBSCRIBE_METADATA, subs, ctor);
	};
}

export function isRabbitConsumer(ctor: Constructor): boolean {
	return Reflect.getOwnMetadata(RABBIT_CONSUMER_METADATA, ctor) === true;
}

export function getSubscriptions(ctor: Constructor): SubscribeConfig[] {
	return Reflect.getOwnMetadata(RABBIT_SUBSCRIBE_METADATA, ctor) ?? [];
}
