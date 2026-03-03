import { describe, expect, test } from "bun:test";
import type { OnModuleInit } from "../index";
import { AppStartup, Injectable, Module } from "../index";

const executionOrder: string[] = [];

@Injectable()
class ModuleInitService implements OnModuleInit {
	async onModuleInit(): Promise<void> {
		await new Promise((resolve) => setTimeout(resolve, 20));
		executionOrder.push("hook");
	}
}

@Module({
	providers: [ModuleInitService],
})
class ModuleInitTestModule {}

describe("OnModuleInit", () => {
	test("should execute and await onModuleInit during module startup", async () => {
		executionOrder.length = 0;

		await AppStartup.create(ModuleInitTestModule);
		executionOrder.push("create");

		expect(executionOrder).toEqual(["hook", "create"]);
	});
});
