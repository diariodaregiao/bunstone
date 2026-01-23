import "reflect-metadata";
import { BULLMQ_PROCESS_METADATA } from "../constants";

export interface ProcessOptions {
	name?: string;
}

/**
 * Decorator that marks a method as a BullMQ job handler.
 * @param name Optional job name to match.
 */
export function Process(name?: string): MethodDecorator {
	return (target: any, propertyKey: string | symbol, _descriptor?: any) => {
		const sym = Symbol.for("dip:providers:bullmq");

		target[sym] = target[sym] || [];
		target[sym].push({
			name,
			methodName: propertyKey as string,
			type: "bullmq",
		});

		Reflect.defineMetadata(
			BULLMQ_PROCESS_METADATA,
			{ name },
			target,
			propertyKey,
		);
	};
}
