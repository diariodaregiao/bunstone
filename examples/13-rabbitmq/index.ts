import {
	AppStartup,
	Controller,
	Get,
	Injectable,
	Module,
	Query,
	RabbitConsumer,
	RabbitMQModule,
	RabbitMQService,
	RabbitSubscribe,
} from "../../index";
import type { RabbitMessage } from "../../index";

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

// ─── 3. Service (publisher) ─────────────────────────────────────────────────

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

// ─── 4. Controller ───────────────────────────────────────────────────────────

@Controller("/orders")
export class OrderController {
	constructor(private readonly orderService: OrderService) {}

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
}

// ─── 5. App Module ───────────────────────────────────────────────────────────

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
					// Dead letter exchange for failed messages
					deadLetterExchange: "events.dlx",
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
	providers: [OrderService, OrderConsumer, NotificationConsumer],
})
class AppModule {}

// ─── 6. Start ────────────────────────────────────────────────────────────────

console.log("Starting RabbitMQ example…");
console.log(
	"Ensure RabbitMQ is running: docker run -p 5672:5672 rabbitmq:4-management",
);
AppStartup.create(AppModule).then(({ listen }) => listen(3000));
