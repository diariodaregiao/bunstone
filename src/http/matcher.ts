interface CompiledRoute {
	path: string;
	regex: RegExp;
	params: string[];
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
			.replace(/\*/g, "(.*)");
		this.routes.push({ path, regex: new RegExp(`^${pattern}$`), params });
	}

	match(pathname: string): RouteMatch | undefined {
		for (const route of this.routes) {
			const result = route.regex.exec(pathname);
			if (!result) continue;
			const params: Record<string, string> = {};
			route.params.forEach((name, index) => {
				params[name] = decodeURIComponent(result[index + 1] ?? "");
			});
			return { path: route.path, params };
		}
		return undefined;
	}
}
