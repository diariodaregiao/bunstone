import { ScheduleError } from "@/errors";
import { Logger } from "@/utils/logger";
import {
	DEFAULT_CRON_TZ,
	getSchedules,
	type ScheduleEntry,
} from "./decorators";

export class Scheduler {
	private readonly logger = new Logger("Scheduler");
	private readonly stoppers: Array<() => void> = [];

	start(instances: readonly unknown[]): void {
		for (const instance of instances) {
			const ctor = (instance as { constructor?: unknown })?.constructor;
			if (typeof ctor !== "function") continue;
			for (const entry of getSchedules(ctor as never)) {
				this.startEntry(instance as Record<string, unknown>, entry);
			}
		}
	}

	private startEntry(
		instance: Record<string, unknown>,
		entry: ScheduleEntry,
	): void {
		const method = instance[entry.methodName];
		if (typeof method !== "function") return;
		const run = this.guarded(entry, () => method.call(instance));

		if (entry.type === "cron") {
			const expression = entry.expression ?? "";
			// Bun reads schedules in the server's local zone since 1.4; pinning the
			// zone keeps a job on the same instant on every machine it runs on
			const tz = entry.tz ?? DEFAULT_CRON_TZ;
			try {
				Bun.cron.parse(expression, Date.now(), { tz });
			} catch {
				throw ScheduleError.invalidCron(expression, tz);
			}
			const job = Bun.cron(expression, run, { tz });
			this.stoppers.push(() => job.stop());
		} else if (entry.type === "interval") {
			const id = setInterval(run, entry.ms);
			this.stoppers.push(() => clearInterval(id));
		} else {
			const id = setTimeout(run, entry.ms);
			this.stoppers.push(() => clearTimeout(id));
		}
	}

	private guarded(
		entry: ScheduleEntry,
		method: () => unknown,
	): () => Promise<void> {
		let running = false;
		return async () => {
			if (running) return;
			running = true;
			try {
				await method();
			} catch (error) {
				this.logger.error(`Scheduled job "${entry.methodName}" failed:`, error);
			} finally {
				running = false;
			}
		};
	}

	stopAll(): void {
		for (const stop of this.stoppers) stop();
		this.stoppers.length = 0;
	}
}
