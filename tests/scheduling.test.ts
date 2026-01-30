import { describe, expect, test } from "bun:test";
import { AppStartup, Cron, Injectable, Module, Timeout } from "../index";

let timeoutCalled = false;
let cronCalled = false;

@Injectable()
class TaskService {
	@Timeout(100)
	onTimeout() {
		timeoutCalled = true;
	}

	@Cron("* * * * * *") // Every second
	onCron() {
		cronCalled = true;
	}
}

@Module({
	providers: [TaskService],
})
class TaskModule {}

describe("Scheduling", () => {
	test("should trigger timeout and cron jobs", async () => {
		const _app = await AppStartup.create(TaskModule);
		// AppStartup.create registers everything.

		// Wait for timeout
		await new Promise((resolve) => setTimeout(resolve, 200));
		expect(timeoutCalled).toBe(true);

		// Wait for cron (every second)
		await new Promise((resolve) => setTimeout(resolve, 1500));
		expect(cronCalled).toBe(true);
	});
});
