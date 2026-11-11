import "reflect-metadata";
import {
	Application,
	CommandBus,
	CommandHandler,
	Controller,
	CqrsModule,
	Injectable,
	Module,
	Post,
	RabbitConsumer,
	type RabbitMessage,
	RabbitMQModule,
	RabbitSubscribe,
} from "@grupodiariodaregiao/bunstone";

class PlaceOrder {
	constructor(readonly id: string) {}
}

@CommandHandler(PlaceOrder)
@Injectable()
class PlaceOrderHandler {
	execute(command: PlaceOrder) {
		return { placed: command.id };
	}
}

@RabbitConsumer()
@Injectable()
class OrdersConsumer {
	@RabbitSubscribe({ queue: "bundle.orders" })
	handle(_message: RabbitMessage<unknown>) {}
}

@Controller("orders")
class OrdersController {
	constructor(private readonly commands: CommandBus) {}

	@Post()
	place() {
		return this.commands.execute(new PlaceOrder("o-1"));
	}
}

@Module({
	imports: [
		CqrsModule.register(),
		// unreachable on purpose: the app must boot and serve while it retries
		RabbitMQModule.register({ uri: "amqp://guest:guest@127.0.0.1:1", reconnect: { enabled: false } }),
	],
	controllers: [OrdersController],
	providers: [PlaceOrderHandler, OrdersConsumer],
})
class AppModule {}

const app = await Application.create(AppModule, { logStartup: false, gracefulShutdown: false });
const booted = performance.now();
app.listen(0);
const res = await fetch(`${app.getServer()!.url}orders`, { method: "POST" });
const body = await res.json();
await app.close();
console.log(JSON.stringify({ ok: res.status === 200 && body.placed === "o-1", booted, rss: process.memoryUsage().rss }));
