import {
	AppStartup,
	Controller,
	Get,
	Injectable,
	Module,
	Query,
	RabbitConsumer,
	RabbitMQDeadLetterService,
	RabbitMQModule,
	RabbitMQService,
	RabbitSubscribe,
} from "../../index";
import type { DeadLetterMessage, RabbitMessage } from "../../index";

// ─── 1. Types ───────────────────────────────────────────────────────────────

interface OrderPayload {
	orderId: string;
	product: string;
	quantity: number;
}

interface NotificationPayload {
	userId: string;
	message: string;
}

// ─── 2. Consumers ────────────────────────────────────────────────────────────

/**
 * Handles messages from the "orders.created" queue.
 * Messages require manual acknowledgement (default).
 */
@RabbitConsumer()
export class OrderConsumer {
	@RabbitSubscribe({ queue: "orders.created" })
	async handleOrderCreated(msg: RabbitMessage<OrderPayload>) {
		const { orderId, product, quantity } = msg.data;
		console.log(
			`[OrderConsumer] New order: #${orderId} – ${quantity}x ${product}`,
		);

		// Simulate async processing
		await new Promise((resolve) => setTimeout(resolve, 200));

		// Acknowledge the message so it's removed from the queue
		msg.ack();
	}

	@RabbitSubscribe({ queue: "orders.cancelled" })
	async handleOrderCancelled(msg: RabbitMessage<{ orderId: string }>) {
		console.log(`[OrderConsumer] Order cancelled: #${msg.data.orderId}`);
		msg.ack();
	}
}

/**
 * Handles messages from the "notifications" queue.
 * Uses noAck mode – no manual acknowledgement needed.
 */
@RabbitConsumer()
export class NotificationConsumer {
	@RabbitSubscribe({ queue: "notifications", noAck: true })
	async handleNotification(msg: RabbitMessage<NotificationPayload>) {
		console.log(
			`[NotificationConsumer] Notify user ${msg.data.userId}: ${msg.data.message}`,
		);
	}
}

// ─── 3. Dead Letter Consumer ─────────────────────────────────────────────────

/**
 * Consumes messages that landed in the Dead Letter Queue for "orders.cancelled".
 *
 * The `deathInfo` property on the message contains structured metadata from the
 * RabbitMQ `x-death` header (original queue, exchange, reason, timestamp, etc.).
 *
 * Options:
 *   msg.ack()                             → remove permanently from DLQ
 *   msg.nack(true)                        → put back in DLQ
 *   msg.republish('events', 'orders.cancelled') → retry via original exchange
 */
@RabbitConsumer()
export class OrderDLQConsumer {
	@RabbitSubscribe({ queue: "orders.cancelled.dlq" })
	async handleFailedCancelledOrder(msg: DeadLetterMessage<{ orderId: string }>) {
		const { orderId } = msg.data;
		const info = msg.deathInfo;

		console.warn(
			`[DLQ] Dead letter received: orderId=${orderId}` +
				(info ? ` | reason=${info.reason} | from=${info.queue} | count=${info.count}` : ""),
		);

		// Decide what to do based on death count
		if ((info?.count ?? 0) < 3) {
			// Retry: republish back to the original exchange
			console.log(`[DLQ] Retrying order #${orderId}…`);
			await msg.republish("events", "orders.cancelled");
			msg.ack(); // remove from DLQ after successful republish
		} else {
			// Too many failures – log and discard
			console.error(`[DLQ] Giving up on order #${orderId} after ${info?.count} attempts`);
			msg.ack();
		}
	}
}

// ─── 4. Service (publisher) ─────────────────────────────────────────────────

@Injectable()
export class OrderService {
	constructor(private readonly rabbit: RabbitMQService) {}

	async createOrder(product: string, quantity: number) {
		const payload: OrderPayload = {
			orderId: `ORD-${Date.now()}`,
			product,
			quantity,
		};

		// Publish to the "events" exchange; routing key routes to "orders.created"
		await this.rabbit.publish("events", "orders.created", payload);
		return payload;
	}

	async cancelOrder(orderId: string) {
		await this.rabbit.publish("events", "orders.cancelled", { orderId });
		return { orderId, status: "cancelled" };
	}

	async sendNotification(userId: string, message: string) {
		// Send directly to a queue, bypassing the exchange
		await this.rabbit.sendToQueue("notifications", { userId, message });
		return { sent: true };
	}
}

// ─── 5. Controller ───────────────────────────────────────────────────────────

@Controller("/orders")
export class OrderController {
	constructor(
		private readonly orderService: OrderService,
		private readonly dlq: RabbitMQDeadLetterService,
	) {}

	@Get("/create")
	async create(
		@Query("product") product: string,
		@Query("qty") qty: string,
	) {
		const order = await this.orderService.createOrder(
			product ?? "Widget",
			Number(qty ?? 1),
		);
		return { message: "Order published", order };
	}

	@Get("/cancel")
	async cancel(@Query("id") id: string) {
		return this.orderService.cancelOrder(id ?? "ORD-UNKNOWN");
	}

	@Get("/notify")
	async notify(
		@Query("userId") userId: string,
		@Query("msg") message: string,
	) {
		return this.orderService.sendNotification(
			userId ?? "user-1",
			message ?? "Hello!",
		);
	}

	// ── DLQ admin endpoints ────────────────────────────────────────────────

	/** GET /orders/dlq/count – how many messages in the DLQ */
	@Get("/dlq/count")
	async dlqCount() {
		const count = await this.dlq.messageCount("orders.cancelled.dlq");
		return { queue: "orders.cancelled.dlq", count };
	}

	/** GET /orders/dlq/inspect – peek at the first N messages */
	@Get("/dlq/inspect")
	async dlqInspect(@Query("limit") limit: string) {
		const messages = await this.dlq.inspect("orders.cancelled.dlq", Number(limit ?? 10));
		return {
			count: messages.length,
			messages: messages.map((m) => ({
				data: m.data,
				deathInfo: m.deathInfo,
			})),
		};
	}

	/** GET /orders/dlq/requeue – move messages back to the original exchange */
	@Get("/dlq/requeue")
	async dlqRequeue(@Query("limit") limit: string) {
		const requeued = await this.dlq.requeueMessages({
			fromQueue: "orders.cancelled.dlq",
			toExchange: "events",
			routingKey: "orders.cancelled",
			count: limit ? Number(limit) : undefined,
		});
		return { requeued };
	}

	/** GET /orders/dlq/discard – permanently remove messages from the DLQ */
	@Get("/dlq/discard")
	async dlqDiscard(@Query("limit") limit: string) {
		const discarded = await this.dlq.discardMessages(
			"orders.cancelled.dlq",
			limit ? Number(limit) : undefined,
		);
		return { discarded };
	}
}

// ─── 6. App Module ───────────────────────────────────────────────────────────

@Module({
	imports: [
		RabbitMQModule.register({
			// Provide either `uri` or individual fields
			uri: process.env.RABBITMQ_URI ?? "amqp://guest:guest@localhost:5672",

			// Declare exchanges (asserted at startup)
			exchanges: [
				{
					name: "events",
					type: "topic",
					durable: true,
				},
			],

			// Declare queues and bind them to the exchange
			queues: [
				{
					name: "orders.created",
					durable: true,
					bindings: { exchange: "events", routingKey: "orders.created" },
				},
				{
					name: "orders.cancelled",
					durable: true,
					bindings: { exchange: "events", routingKey: "orders.cancelled" },
					//
					// Dead Letter configuration ─────────────────────────────────
					// Messages rejected or expired here land in "orders.cancelled.dlq".
					//
					// `deadLetterQueue` triggers auto-topology:
					//   - asserts exchange "orders.cancelled.dlx" (direct)
					//   - asserts queue    "orders.cancelled.dlq"
					//   - binds DLQ → DLX with the deadLetterRoutingKey
					//
					deadLetterExchange: "orders.cancelled.dlx",
					deadLetterRoutingKey: "orders.cancelled.dead",
					deadLetterQueue: "orders.cancelled.dlq",
					messageTtl: 30_000, // messages expire after 30 s → go to DLQ
				},
				{
					name: "notifications",
					durable: true,
				},
			],

			// How many unacked messages each consumer channel may hold
			prefetch: 5,

			reconnect: {
				enabled: true,
				delay: 3000,
				maxRetries: 10,
			},
		}),
	],
	controllers: [OrderController],
	providers: [OrderService, OrderConsumer, NotificationConsumer, OrderDLQConsumer],
})
class AppModule {}

// ─── 7. Start ────────────────────────────────────────────────────────────────

console.log("Starting RabbitMQ example…");
console.log(
	"Ensure RabbitMQ is running: docker run -p 5672:5672 rabbitmq:4-management",
);
AppStartup.create(AppModule).then(({ listen }) => listen(3000));
