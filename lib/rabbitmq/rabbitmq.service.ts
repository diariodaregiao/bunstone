import "reflect-metadata";
import {
	context as otelContext,
	metrics as otelMetrics,
	propagation,
	SpanKind,
	SpanStatusCode,
	trace,
} from "@opentelemetry/api";
import type { Options } from "amqplib";
import { Injectable } from "../injectable";
import { Logger } from "../utils/logger";
import type { RabbitPublishOptions } from "./interfaces/rabbitmq-message.interface";
import { RabbitMQConnection } from "./rabbitmq-connection";

@Injectable()
export class RabbitMQService {
	private readonly logger = new Logger(RabbitMQService.name);

	/**
	 * Publish a message to an exchange.
	 */
	async publish(
		exchange: string,
		routingKey: string,
		data: unknown,
		options?: RabbitPublishOptions,
	): Promise<void> {
		const tracer = trace.getTracer("bunstone.rabbitmq");
		const span = tracer.startSpan(`rabbitmq.publish ${exchange}`, {
			kind: SpanKind.PRODUCER,
			attributes: {
				"messaging.system": "rabbitmq",
				"messaging.operation.type": "publish",
				"messaging.destination.name": exchange,
				"messaging.rabbitmq.destination.routing_key": routingKey,
			},
		});

		// Inject W3C trace context into message headers for distributed tracing
		const traceHeaders: Record<string, string> = {};
		propagation.inject(trace.setSpan(otelContext.active(), span), traceHeaders);

		const start = performance.now();
		return otelContext.with(
			trace.setSpan(otelContext.active(), span),
			async () => {
				try {
					const channel = await RabbitMQConnection.getPublisherChannel();
					const content = Buffer.from(JSON.stringify(data));
					const publishOptions: Options.Publish = {
						persistent: options?.persistent ?? true,
						contentType: options?.contentType ?? "application/json",
						contentEncoding: options?.contentEncoding ?? "utf-8",
						headers: { ...options?.headers, ...traceHeaders },
						correlationId: options?.correlationId,
						replyTo: options?.replyTo,
						messageId: options?.messageId,
						expiration:
							options?.expiration !== undefined
								? String(options.expiration)
								: undefined,
						priority: options?.priority,
					};

					await new Promise<void>((resolve, reject) => {
						channel.publish(
							exchange,
							routingKey,
							content,
							publishOptions,
							(err) => {
								if (err) {
									this.logger.error(
										`Failed to publish to exchange "${exchange}" with key "${routingKey}": ${err.message}`,
									);
									reject(err);
								} else {
									resolve();
								}
							},
						);
					});
					span.setStatus({ code: SpanStatusCode.OK });
				} catch (err: any) {
					span.recordException(err);
					span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
					throw err;
				} finally {
					span.end();
					try {
						otelMetrics
							.getMeter("bunstone")
							.createHistogram("messaging.rabbitmq.publish.duration", {
								description: "Duration of RabbitMQ message publishing",
								unit: "ms",
							})
							.record(performance.now() - start, {
								"messaging.destination.name": exchange,
								"messaging.rabbitmq.destination.routing_key": routingKey,
							});
					} catch {
						// best-effort
					}
				}
			},
		);
	}

	/**
	 * Send a message directly to a queue (bypasses exchange routing).
	 */
	async sendToQueue(
		queue: string,
		data: unknown,
		options?: RabbitPublishOptions,
	): Promise<void> {
		const tracer = trace.getTracer("bunstone.rabbitmq");
		const span = tracer.startSpan(`rabbitmq.sendToQueue ${queue}`, {
			kind: SpanKind.PRODUCER,
			attributes: {
				"messaging.system": "rabbitmq",
				"messaging.operation.type": "publish",
				"messaging.destination.name": queue,
			},
		});

		const traceHeaders: Record<string, string> = {};
		propagation.inject(trace.setSpan(otelContext.active(), span), traceHeaders);

		const start = performance.now();
		return otelContext.with(
			trace.setSpan(otelContext.active(), span),
			async () => {
				try {
					const channel = await RabbitMQConnection.getPublisherChannel();
					const content = Buffer.from(JSON.stringify(data));
					const publishOptions: Options.Publish = {
						persistent: options?.persistent ?? true,
						contentType: options?.contentType ?? "application/json",
						contentEncoding: options?.contentEncoding ?? "utf-8",
						headers: { ...options?.headers, ...traceHeaders },
						correlationId: options?.correlationId,
						replyTo: options?.replyTo,
						messageId: options?.messageId,
						expiration:
							options?.expiration !== undefined
								? String(options.expiration)
								: undefined,
						priority: options?.priority,
					};

					await new Promise<void>((resolve, reject) => {
						channel.sendToQueue(queue, content, publishOptions, (err) => {
							if (err) {
								this.logger.error(
									`Failed to send message to queue "${queue}": ${err.message}`,
								);
								reject(err);
							} else {
								resolve();
							}
						});
					});
					span.setStatus({ code: SpanStatusCode.OK });
				} catch (err: any) {
					span.recordException(err);
					span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
					throw err;
				} finally {
					span.end();
					try {
						otelMetrics
							.getMeter("bunstone")
							.createHistogram("messaging.rabbitmq.publish.duration", {
								description: "Duration of RabbitMQ message publishing",
								unit: "ms",
							})
							.record(performance.now() - start, {
								"messaging.destination.name": queue,
							});
					} catch {
						// best-effort
					}
				}
			},
		);
	}
}
