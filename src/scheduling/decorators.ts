import "reflect-metadata";
import type { Constructor } from "@/core/injectable";

export type ScheduleType = "cron" | "interval" | "timeout";

export interface ScheduleEntry {
	type: ScheduleType;
	methodName: string;
	expression?: string;
	/** IANA time zone the cron expression is read in. */
	tz?: string;
	ms?: number;
}

export interface CronOptions {
	/**
	 * IANA time zone the expression is read in, e.g. `"America/Sao_Paulo"`.
	 * Default `"UTC"`, so a job fires at the same instant whatever the server's
	 * own time zone is.
	 */
	tz?: string;
}

export const DEFAULT_CRON_TZ = "UTC";

export const SCHEDULE_METADATA = "bunstone:schedule";

function addSchedule(target: object, entry: ScheduleEntry): void {
	const ctor = (target as { constructor: Constructor }).constructor;
	const entries: ScheduleEntry[] =
		Reflect.getOwnMetadata(SCHEDULE_METADATA, ctor) ?? [];
	entries.push(entry);
	Reflect.defineMetadata(SCHEDULE_METADATA, entries, ctor);
}

export function Cron(
	expression: string,
	options: CronOptions = {},
): MethodDecorator {
	return (target, propertyKey) => {
		addSchedule(target, {
			type: "cron",
			expression,
			tz: options.tz ?? DEFAULT_CRON_TZ,
			methodName: String(propertyKey),
		});
	};
}

export function Interval(ms: number): MethodDecorator {
	return (target, propertyKey) => {
		addSchedule(target, {
			type: "interval",
			ms,
			methodName: String(propertyKey),
		});
	};
}

export function Timeout(ms: number): MethodDecorator {
	return (target, propertyKey) => {
		addSchedule(target, {
			type: "timeout",
			ms,
			methodName: String(propertyKey),
		});
	};
}

/** Inherited, so a subclass provider still runs the jobs it inherited. */
export function getSchedules(ctor: Constructor): ScheduleEntry[] {
	return Reflect.getMetadata(SCHEDULE_METADATA, ctor) ?? [];
}
