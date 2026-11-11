import type { Constructor } from "@/core/injectable";
import type { DynamicModule, ModuleImport } from "@/core/module";
import type { RateLimitConfig, ResolvedRateLimit } from "./decorator";
import {
	extractRateLimitModuleConfig,
	type RateLimitModuleOptions,
	toRateLimitConfig,
} from "./rate-limit-module";

function isDynamicModule(entry: ModuleImport): entry is DynamicModule {
	return typeof entry === "object" && entry !== null && "module" in entry;
}

function moduleOf(entry: ModuleImport): Constructor {
	return isDynamicModule(entry) ? entry.module : entry;
}

interface OwnLimit {
	limit: ResolvedRateLimit;
	scope: "subtree" | "module";
}

/** Lower allowance per millisecond is stricter; ties go to the smaller `max`. */
function stricter(a: RateLimitConfig, b: RateLimitConfig): boolean {
	const rateA = a.max / a.windowMs;
	const rateB = b.max / b.windowMs;
	if (rateA !== rateB) return rateA < rateB;
	return a.max < b.max;
}

/**
 * Which `RateLimitModule.register()` limit applies to the controllers of each
 * module.
 *
 * - A module that imports `RateLimitModule.register()` gets that limit.
 *   `scope: "subtree"` (default) also applies it to every module reachable
 *   through its imports, overriding any limit inherited from further up.
 *   `scope: "module"` applies it to that module only.
 * - The whole subtree counts against one bucket, named after the module that
 *   registered the limit, so a client's budget is shared across its routes.
 * - A module reachable through several paths is limited whenever any path
 *   carries a limit; if paths carry different limits, the strictest applies.
 *   The result never depends on the order of `imports`.
 */
export function resolveModuleRateLimits(
	root: Constructor,
	moduleImports: ReadonlyMap<Constructor, readonly ModuleImport[]>,
): Map<Constructor, ResolvedRateLimit> {
	const ownLimits = new Map<Constructor, OwnLimit>();
	const usedBuckets = new Set<string>();

	const ownLimit = (moduleClass: Constructor): OwnLimit | undefined => {
		if (ownLimits.has(moduleClass)) return ownLimits.get(moduleClass);
		let options: RateLimitModuleOptions | undefined;
		for (const entry of moduleImports.get(moduleClass) ?? []) {
			if (!isDynamicModule(entry)) continue;
			options = extractRateLimitModuleConfig(entry);
			if (options) break;
		}
		let own: OwnLimit | undefined;
		if (options) {
			// two modules can share a class name; their buckets must not
			let bucket = `module:${moduleClass.name || "anonymous"}`;
			for (let n = 2; usedBuckets.has(bucket); n++) {
				bucket = `module:${moduleClass.name || "anonymous"}#${n}`;
			}
			usedBuckets.add(bucket);
			own = {
				limit: { ...toRateLimitConfig(options), bucket },
				scope: options.scope === "module" ? "module" : "subtree",
			};
		}
		ownLimits.set(moduleClass, own as OwnLimit);
		return own;
	};

	const moduleOnly = new Map<Constructor, ResolvedRateLimit>();
	const candidates = new Map<Constructor, ResolvedRateLimit[]>();
	// (module, inherited bucket) pairs already walked: keeps diamonds linear
	// and cycles finite while still exploring every distinct inherited limit
	const walked = new Map<Constructor, Set<string>>();

	const walk = (moduleClass: Constructor, inherited?: ResolvedRateLimit) => {
		const marker = inherited?.bucket ?? "";
		const seen = walked.get(moduleClass) ?? new Set<string>();
		if (seen.has(marker)) return;
		seen.add(marker);
		walked.set(moduleClass, seen);

		const own = ownLimit(moduleClass);
		let propagate = inherited;
		if (own?.scope === "module") {
			moduleOnly.set(moduleClass, own.limit);
		} else {
			propagate = own?.limit ?? inherited;
			if (propagate) {
				const list = candidates.get(moduleClass) ?? [];
				if (!list.includes(propagate)) list.push(propagate);
				candidates.set(moduleClass, list);
			}
		}

		for (const entry of moduleImports.get(moduleClass) ?? []) {
			walk(moduleOf(entry), propagate);
		}
	};

	walk(root);

	const result = new Map<Constructor, ResolvedRateLimit>();
	for (const [moduleClass, list] of candidates) {
		let chosen = list[0] as ResolvedRateLimit;
		for (const limit of list.slice(1)) {
			if (stricter(limit, chosen)) chosen = limit;
		}
		result.set(moduleClass, chosen);
	}
	for (const [moduleClass, limit] of moduleOnly) {
		result.set(moduleClass, limit);
	}
	return result;
}
