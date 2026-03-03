import { describe, expect, test } from "bun:test";
import type { OnModuleDestroy } from "../index";
import { AppStartup, Injectable, Module } from "../index";

const executionOrder: string[] = [];

@Injectable()
class ModuleDestroyService implements OnModuleDestroy {
	async onModuleDestroy(): Promise<void> {
		executionOrder.push("hook");
	}
}

@Module({
	providers: [ModuleDestroyService],
})
class ModuleDestroyTestModule {}

describe("OnModuleDestroy", () => {
	test("should execute and await onModuleDestroy on Elysia stop lifecycle", async () => {
		executionOrder.length = 0;

		const app = await AppStartup.create(ModuleDestroyTestModule);
		const stopHandlers: { fn: (app: any) => Promise<void> | void }[] =
			(app.getElysia() as any).event?.stop || [];

		for (const handler of stopHandlers) {
			await handler.fn(app.getElysia());
		}

		executionOrder.push("stop");

		expect(executionOrder).toEqual(["hook", "stop"]);
	});
});
