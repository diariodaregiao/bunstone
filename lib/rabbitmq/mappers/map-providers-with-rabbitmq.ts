import type { ModuleConfig } from "../../types/module-config";
import { RABBITMQ_SUBSCRIBE_SYMBOL } from "../constants";
import type { RabbitSubscribeOptions } from "../interfaces/rabbitmq-message.interface";

export interface RabbitMQMethodDescriptor {
	methodName: string;
	options: RabbitSubscribeOptions;
}

/**
 * Scans module providers for classes that have `@RabbitSubscribe` methods
 * (identified by the shared prototype symbol) and returns a map of
 * provider class → list of handler descriptors.
 */
export const MapProvidersWithRabbitMQ = {
	execute(
		providers: ModuleConfig["providers"] = [],
	): Map<any, RabbitMQMethodDescriptor[]> {
		const result = new Map<any, RabbitMQMethodDescriptor[]>();

		for (const provider of providers) {
			const methods: any[] | undefined =
				provider.prototype[RABBITMQ_SUBSCRIBE_SYMBOL];

			if (!methods || methods.length === 0) continue;

			const descriptors: RabbitMQMethodDescriptor[] = methods
				.filter((m) => m.type === "rabbitmq")
				.map((m) => ({
					methodName: m.methodName as string,
					options: m.options as RabbitSubscribeOptions,
				}));

			if (descriptors.length > 0) {
				result.set(provider, descriptors);
			}
		}

		return result;
	},
};
