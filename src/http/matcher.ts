interface CompiledRoute {
	path: string;
	regex: RegExp;
	params: string[];
	/** Per-segment specificity, compared left to right. */
	segments: number[];
}

export interface RouteMatch {
	path: string;
	params: Record<string, string>;
}

export class RouteMatcher {
	private readonly routes: CompiledRoute[] = [];

	add(path: string): void {
		const params: string[] = [];
		const catchAll = path.endsWith("*");
		const body = catchAll ? path.slice(0, -1) : path;
		// every `*` is escaped; only a trailing one is a catch-all, matching how
		// Bun's router treats it. Left unescaped it would become a quantifier and
		// claim paths the real server answers 404 for.
		const pattern =
			body
				.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
				.replace(/:([^/]+)/g, (_match, name: string) => {
					params.push(name);
					return "([^/]+)";
				}) + (catchAll ? "(.*)" : "");
		this.routes.push({
			path,
			regex: new RegExp(`^${pattern}$`),
			params,
			segments: rank(path),
		});
		// Bun's router prefers whichever route is static earliest, regardless of
		// declaration order; match the same way so tests mirror production
		this.routes.sort((a, b) => compare(a, b));
	}

	match(pathname: string): RouteMatch | undefined {
		for (const route of this.routes) {
			const result = route.regex.exec(pathname);
			if (!result) continue;
			const params: Record<string, string> = {};
			route.params.forEach((name, index) => {
				params[name] = safeDecode(result[index + 1] ?? "");
			});
			return { path: route.path, params };
		}
		return undefined;
	}
}

/** Static beats `:param`, which beats a catch-all `*`. */
function rank(path: string): number[] {
	return path
		.split("/")
		.filter(Boolean)
		.map((segment) => {
			if (segment === "*") return 0;
			if (segment.startsWith(":")) return 1;
			return 2;
		});
}

/**
 * Compares left to right, so the route that is static earliest wins — a summed
 * score would let a later static segment outrank an earlier one, which is not
 * how Bun resolves it.
 */
function compare(a: CompiledRoute, b: CompiledRoute): number {
	const length = Math.max(a.segments.length, b.segments.length);
	for (let index = 0; index < length; index++) {
		const left = a.segments[index] ?? -1;
		const right = b.segments[index] ?? -1;
		if (left !== right) return right - left;
	}
	return b.segments.length - a.segments.length;
}

/** A malformed percent-escape must not blow up routing. */
function safeDecode(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}
