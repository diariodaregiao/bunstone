/** Reflect metadata key for classes decorated with @RabbitConsumer() */
export const RABBITMQ_CONSUMER_METADATA = Symbol("dip:rabbitmq:consumer");

/** Symbol key used to store @RabbitSubscribe method descriptors on the prototype */
export const RABBITMQ_SUBSCRIBE_SYMBOL = Symbol.for("dip:providers:rabbitmq");

/** Reflect metadata key for @RabbitSubscribe method options */
export const RABBITMQ_SUBSCRIBE_METADATA = Symbol("dip:rabbitmq:subscribe");
