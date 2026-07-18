import "reflect-metadata";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Application } from "@/core/application";
import { Injectable } from "@/core/injectable";
import { Module } from "@/core/module";
import { CommandBus } from "@/cqrs/command-bus";
import { CqrsModule } from "@/cqrs/cqrs-module";
import { CommandHandler, EventHandler, QueryHandler } from "@/cqrs/decorators";
import { EventBus } from "@/cqrs/event-bus";
import type {
	ICommandHandler,
	IEventHandler,
	IQueryHandler,
} from "@/cqrs/interfaces";
import { QueryBus } from "@/cqrs/query-bus";

class CreateUser {
	constructor(readonly name: string) {}
}
class GetUser {
	constructor(readonly id: string) {}
}
class UserCreated {
	constructor(readonly name: string) {}
}

const sideEffects: string[] = [];

@CommandHandler(CreateUser)
@Injectable()
class CreateUserHandler implements ICommandHandler<CreateUser, { id: string }> {
	execute(command: CreateUser) {
		return { id: `id-${command.name}` };
	}
}

@QueryHandler(GetUser)
@Injectable()
class GetUserHandler implements IQueryHandler<GetUser, { id: string }> {
	execute(query: GetUser) {
		return { id: query.id };
	}
}

@EventHandler(UserCreated)
@Injectable()
class SendWelcome implements IEventHandler<UserCreated> {
	handle(event: UserCreated) {
		sideEffects.push(`welcome:${event.name}`);
	}
}

@EventHandler(UserCreated)
@Injectable()
class FailingHandler implements IEventHandler<UserCreated> {
	handle() {
		throw new Error("handler boom");
	}
}

@EventHandler(UserCreated)
@Injectable()
class AuditHandler implements IEventHandler<UserCreated> {
	handle(event: UserCreated) {
		sideEffects.push(`audit:${event.name}`);
	}
}

@Module({
	imports: [CqrsModule.register()],
	providers: [
		CreateUserHandler,
		GetUserHandler,
		SendWelcome,
		FailingHandler,
		AuditHandler,
	],
})
class AppModule {}

let app: Application;

beforeEach(async () => {
	sideEffects.length = 0;
	app = await Application.create(AppModule, {
		gracefulShutdown: false,
		logStartup: false,
	});
});

afterEach(async () => {
	await app.close();
});

describe("CQRS buses", () => {
	it("routes a command to its handler", async () => {
		const bus = app.resolve(CommandBus);
		const result = await bus.execute<{ id: string }>(new CreateUser("ada"));
		expect(result).toEqual({ id: "id-ada" });
	});

	it("routes a query to its handler", async () => {
		const bus = app.resolve(QueryBus);
		const result = await bus.execute<{ id: string }>(new GetUser("7"));
		expect(result).toEqual({ id: "7" });
	});

	it("throws for an unregistered command", async () => {
		const bus = app.resolve(CommandBus);
		class Unknown {}
		await expect(bus.execute(new Unknown())).rejects.toThrow(/No handler/);
	});

	it("delivers an event to every handler, isolating failures", async () => {
		const bus = app.resolve(EventBus);
		await bus.publishAndWait(new UserCreated("linus"));
		expect(sideEffects.sort()).toEqual(["audit:linus", "welcome:linus"]);
	});
});
