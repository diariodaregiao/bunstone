import "reflect-metadata";
import { Injectable } from "../../injectable";
import { BULLMQ_PROCESSOR_METADATA } from "../constants";

export interface ProcessorOptions {
	queueName: string;
	concurrency?: number;
}

/**
 * Decorator that marks a class as a BullMQ processor.
 * @param queueName Or options object with queueName.
 */
export function Processor(options: string | ProcessorOptions): ClassDecorator {
	const processorOptions =
		typeof options === "string" ? { queueName: options } : options;

	return (target: any) => {
		Reflect.defineMetadata(BULLMQ_PROCESSOR_METADATA, processorOptions, target);
		Injectable()(target);
	};
}
