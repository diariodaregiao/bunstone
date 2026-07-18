import { ScheduleError } from "@/errors";
import { Logger } from "@/utils/logger";
import { getSchedules, type ScheduleEntry } from "./decorators";

interface BunCronJob {
	stop(): void;
	unref(): void;
	ref(): void;
}

interface BunCron {
	(schedule: string, handler: () => void | Promise<void>): BunCronJob;
	parse(expression: string, relativeDate?: Date | number): Date | null;
}

const bunCron = (Bun as unknown as { cron: BunCron }).cron;

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
			try {
				bunCron.parse(expression);
			} catch {
				throw ScheduleError.invalidCron(expression);
			}
			const job = bunCron(expression, run);
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
