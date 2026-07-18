import "reflect-metadata";
import type { Constructor } from "@/core/injectable";

export type ScheduleType = "cron" | "interval" | "timeout";

export interface ScheduleEntry {
	type: ScheduleType;
	methodName: string;
	expression?: string;
	ms?: number;
}

export const SCHEDULE_METADATA = "bunstone:schedule";

function addSchedule(target: object, entry: ScheduleEntry): void {
	const ctor = (target as { constructor: Constructor }).constructor;
	const entries: ScheduleEntry[] =
		Reflect.getOwnMetadata(SCHEDULE_METADATA, ctor) ?? [];
	entries.push(entry);
	Reflect.defineMetadata(SCHEDULE_METADATA, entries, ctor);
}

export function Cron(expression: string): MethodDecorator {
	return (target, propertyKey) => {
		addSchedule(target, {
			type: "cron",
			expression,
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

export function getSchedules(ctor: Constructor): ScheduleEntry[] {
	return Reflect.getOwnMetadata(SCHEDULE_METADATA, ctor) ?? [];
}
