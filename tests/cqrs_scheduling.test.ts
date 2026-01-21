import { beforeEach, describe, expect, test } from "bun:test";
import {
	AppStartup,
	Module,
	Timeout,
	Cron,
	Injectable,
	CommandBus,
	QueryBus,
	EventBus,
	CqrsModule,
} from "../index";
import { CommandHandler } from "../lib/cqrs/decorators/command-handler.decorator";
import { EventsHandler } from "../lib/cqrs/decorators/event-handler.decorator";
import { QueryHandler } from "../lib/cqrs/decorators/query-handler.decorator";

class TestCommand {
	constructor(public readonly message: string) {}
}

class TestQuery {
	constructor(public readonly message: string) {}
}

class TestEvent {
	constructor(public readonly message: string) {}
}

let commandHandled = false;
let queryHandled = false;
let eventHandled = false;
let timeoutInjectedCalled = false;
let cronInjectedCalled = false;

@CommandHandler(TestCommand)
class TestCommandHandler {
	async execute(command: TestCommand) {
		commandHandled = true;
		return `Handled: ${command.message}`;
	}
}

@QueryHandler(TestQuery)
class TestQueryHandler {
	async execute(query: TestQuery) {
		queryHandled = true;
		return `Query result for: ${query.message}`;
	}
}

@EventsHandler(TestEvent)
class TestEventHandler {
	async handle(event: TestEvent) {
		eventHandled = true;
	}
}

@Injectable()
class SchedulingService {
	constructor(
		private readonly commandBus: CommandBus,
		private readonly queryBus: QueryBus,
		private readonly eventBus: EventBus,
	) {}

	@Timeout(100)
	async onTimeout() {
		if (this.commandBus && this.queryBus && this.eventBus) {
			timeoutInjectedCalled = true;
			await this.commandBus.execute(new TestCommand("from timeout"));
			await this.queryBus.execute(new TestQuery("from timeout"));
			this.eventBus.publish(new TestEvent("from timeout"));
		}
	}

	@Cron("* * * * * *")
	async onCron() {
		if (this.commandBus && this.queryBus && this.eventBus) {
			cronInjectedCalled = true;
		}
	}
}

@Module({
	imports: [CqrsModule],
	providers: [
		SchedulingService,
		TestCommandHandler,
		TestQueryHandler,
		TestEventHandler,
	],
})
class TestAppModule {}

describe("CQRS + Scheduling Integration", () => {
	beforeEach(() => {
		commandHandled = false;
		queryHandled = false;
		eventHandled = false;
		timeoutInjectedCalled = false;
		cronInjectedCalled = false;
	});

	test("should have dependencies injected in Timeout and Cron handlers", async () => {
		const app = await AppStartup.create(TestAppModule);

		// Wait for timeout (100ms)
		await new Promise((resolve) => setTimeout(resolve, 300));

		expect(timeoutInjectedCalled).toBe(true);
		expect(commandHandled).toBe(true);
		expect(queryHandled).toBe(true);
		expect(eventHandled).toBe(true);

		// Wait for cron (1s)
		await new Promise((resolve) => setTimeout(resolve, 1100));
		expect(cronInjectedCalled).toBe(true);
	});

	test("should execute command directly", async () => {
		const app = await AppStartup.create(TestAppModule);
		const injectables: Map<any, any> = Reflect.getMetadata(
			"dip:injectables",
			TestAppModule,
		);
		const commandBus = injectables.get(CommandBus);

		const result = await commandBus.execute(new TestCommand("direct"));
		expect(commandHandled).toBe(true);
		expect(result).toBe("Handled: direct");
	});

	test("should execute query directly", async () => {
		const app = await AppStartup.create(TestAppModule);
		const injectables: Map<any, any> = Reflect.getMetadata(
			"dip:injectables",
			TestAppModule,

			"dip:injectables",
			TestAppModule,
		);
		const commandBus = injectables.get(CommandBus);

		const result = await commandBus.execute(new TestCommand("direct"));
		expect(commandHandled).toBe(true);
		expect(result).toBe("Handled: direct");
	});

	test("should execute query directly", async () => {
		const app = await AppStartup.create(TestAppModule);
		const injectables: Map<any, any> = Reflect.getMetadata(
			"dip:injectables",
			TestAppModule,
		);
		const queryBus = injectables.get(QueryBus);

		const result = await queryBus.execute(new TestQuery("direct"));
		expect(queryHandled).toBe(true);
		expect(result).toBe("Query result for: direct");
	});
});
