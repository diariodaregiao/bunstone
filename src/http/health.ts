export type HealthCheck = () => boolean | Promise<boolean>;

export interface HealthOptions {
	path?: string;
	readyPath?: string;
	checks?: HealthCheck[];
}

export interface ResolvedHealth {
	path: string;
	readyPath: string;
	checks: HealthCheck[];
}

export function resolveHealth(
	option: boolean | HealthOptions | undefined,
): ResolvedHealth | undefined {
	if (!option) return undefined;
	const options = option === true ? {} : option;
	return {
		path: options.path ?? "/health",
		readyPath: options.readyPath ?? "/ready",
		checks: options.checks ?? [],
	};
}

export async function runChecks(checks: HealthCheck[]): Promise<boolean> {
	for (const check of checks) {
		if (!(await check())) return false;
	}
	return true;
}
