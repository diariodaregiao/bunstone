import { describe, expect, mock, test } from "bun:test";
import { AppStartup, Cron, Injectable, Module, Timeout } from "../index";

let timeoutCalled = false;
let cronCalled = false;
let asyncCronResolved = false;

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

@Injectable()
class AsyncTaskService {
	@Cron("* * * * * *")
	async onAsyncCron() {
		await new Promise((resolve) => setTimeout(resolve, 50));
		asyncCronResolved = true;
	}
}

@Injectable()
class FailingTaskService {
	@Cron("* * * * * *")
	async onFailingCron() {
		throw new Error("cron failed on purpose");
	}
}

@Module({
	providers: [TaskService],
})
class TaskModule {}

@Module({
	providers: [AsyncTaskService],
})
class AsyncTaskModule {}

@Module({
	providers: [FailingTaskService],
})
class FailingTaskModule {}

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

	test("should await async cron handlers without unhandled rejections", async () => {
		const _app = await AppStartup.create(AsyncTaskModule);

		await new Promise((resolve) => setTimeout(resolve, 1200));
		expect(asyncCronResolved).toBe(true);
	});

	test("should catch and log cron handler errors", async () => {
		const errorSpy = mock(() => {});
		const logger = (AppStartup as any).logger;
		const originalError = logger.error;
		logger.error = errorSpy;

		try {
			await AppStartup.create(FailingTaskModule);
			await new Promise((resolve) => setTimeout(resolve, 1200));

			expect(errorSpy).toHaveBeenCalled();
			const [message] = errorSpy.mock.calls[0] ?? [];
			expect(String(message)).toContain('Cron job "onFailingCron" failed');
		} finally {
			logger.error = originalError;
		}
	});
});
