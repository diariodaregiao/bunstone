interface CompiledRoute {
	path: string;
	regex: RegExp;
	params: string[];
	score: number;
}

export interface RouteMatch {
	path: string;
	params: Record<string, string>;
}

export class RouteMatcher {
	private readonly routes: CompiledRoute[] = [];

	add(path: string): void {
		const params: string[] = [];
		const pattern = path
			.replace(/[.+?^${}()|[\]\\]/g, "\\$&")
			.replace(/:([^/]+)/g, (_match, name: string) => {
				params.push(name);
				return "([^/]+)";
			})
			// Bun only treats a trailing `*` as a catch-all; anywhere else it is a
			// literal, so matching it as `.*` would claim paths Bun would 404
			.replace(/\*$/, "(.*)");
		this.routes.push({
			path,
			regex: new RegExp(`^${pattern}$`),
			params,
			score: specificity(path),
		});
		// Bun's router prefers static segments over dynamic ones regardless of
		// declaration order; match the same way so tests mirror production
		this.routes.sort((a, b) => b.score - a.score);
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

/** Static segments outrank wildcards, which outrank `:params`. */
function specificity(path: string): number {
	let score = 0;
	for (const segment of path.split("/")) {
		if (!segment) continue;
		if (segment.startsWith(":")) score += 1;
		else if (segment.includes("*")) score += 0;
		else score += 3;
	}
	return score;
}

/** A malformed percent-escape must not blow up routing. */
function safeDecode(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}
