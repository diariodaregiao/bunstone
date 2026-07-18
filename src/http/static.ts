import { resolve, sep } from "node:path";

export interface StaticOptions {
	prefix?: string;

	dir?: string;
}

export class StaticFiles {
	readonly prefix: string;
	private readonly root: string;

	constructor(options: StaticOptions = {}) {
		this.prefix = normalizePrefix(options.prefix ?? "/public");
		this.root = resolve(options.dir ?? "public");
	}

	matches(pathname: string): boolean {
		return pathname === this.prefix || pathname.startsWith(`${this.prefix}/`);
	}

	async serve(pathname: string): Promise<Response> {
		const relative = decodeURIComponent(pathname.slice(this.prefix.length));
		const target = resolve(this.root, `.${relative}`);

		if (target !== this.root && !target.startsWith(this.root + sep)) {
			return new Response("Forbidden", { status: 403 });
		}

		const file = Bun.file(target);
		if (!(await file.exists())) {
			return new Response("Not Found", { status: 404 });
		}
		return new Response(file);
	}
}

function normalizePrefix(prefix: string): string {
	const withLeading = prefix.startsWith("/") ? prefix : `/${prefix}`;
	return withLeading.endsWith("/") ? withLeading.slice(0, -1) : withLeading;
}
