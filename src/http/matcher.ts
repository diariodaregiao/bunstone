interface CompiledRoute {
	path: string;
	regex: RegExp;
	params: string[];
	/** Per-segment specificity, compared left to right. */
	segments: number[];
	/** Declaration index: later declarations win an exact tie, as Bun does. */
	order: number;
}

export interface RouteMatch {
	path: string;
	params: Record<string, string>;
}

export class RouteMatcher {
	private readonly routes: CompiledRoute[] = [];
	private declared = 0;

	add(path: string): void {
		const params: string[] = [];
		const segments = path.split("/").filter(Boolean);
		const ranks: number[] = [];
		let pattern = "";

		segments.forEach((segment, index) => {
			const last = index === segments.length - 1;

			// only a whole trailing segment is a catch-all; `/files*` is a literal
			// path Bun serves verbatim, not a prefix match
			if (last && (segment === "*" || segment === "**")) {
				pattern += "/(.*)";
				params.push("*");
				ranks.push(0);
				return;
			}
			if (segment.startsWith(":")) {
				pattern += "/([^/]+)";
				params.push(segment.slice(1));
				ranks.push(1);
				return;
			}
			pattern += `/${escapeLiteral(segment)}`;
			ranks.push(2);
		});

		this.routes.push({
			path,
			regex: new RegExp(`^${pattern || "/"}$`),
			params,
			segments: ranks,
			order: this.declared++,
		});
		// Bun's router prefers whichever route is static earliest, regardless of
		// declaration order; match the same way so tests mirror production
		this.routes.sort(compare);
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

/** Escapes a static segment; params and wildcards are handled before this. */
function escapeLiteral(segment: string): string {
	return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Compares left to right, so the route that is static earliest wins — a summed
 * score would let a later static segment outrank an earlier one, which is not
 * how Bun resolves it. An exact tie goes to the later declaration.
 */
function compare(a: CompiledRoute, b: CompiledRoute): number {
	const length = Math.max(a.segments.length, b.segments.length);
	for (let index = 0; index < length; index++) {
		const left = a.segments[index] ?? -1;
		const right = b.segments[index] ?? -1;
		if (left !== right) return right - left;
	}
	if (a.segments.length !== b.segments.length) {
		return b.segments.length - a.segments.length;
	}
	return b.order - a.order;
}

/** A malformed percent-escape must not blow up routing. */
function safeDecode(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}
