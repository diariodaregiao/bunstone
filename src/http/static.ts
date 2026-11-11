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

	async serve(pathname: string, req?: Request): Promise<Response> {
		let target: string;
		try {
			const relative = decodeURIComponent(pathname.slice(this.prefix.length));
			// a NUL byte survives decoding and makes path APIs throw
			if (relative.includes("\0")) throw new Error("null byte in path");
			target = resolve(this.root, `.${relative}`);
		} catch {
			// a malformed escape or an unusable path is a bad request, not a 500
			return new Response("Bad Request", { status: 400 });
		}

		if (target !== this.root && !target.startsWith(this.root + sep)) {
			return new Response("Forbidden", { status: 403 });
		}

		const file = Bun.file(target);
		if (!(await file.exists())) {
			return new Response("Not Found", { status: 404 });
		}

		// Bun answers Range requests for a file body on its own; validators are
		// what it leaves to us outside `routes`, and they turn repeat downloads
		// into an empty 304
		const etag = `W/"${file.size.toString(16)}-${Math.trunc(file.lastModified).toString(16)}"`;
		const lastModified = new Date(file.lastModified).toUTCString();
		if (req && isNotModified(req, etag, file.lastModified)) {
			return new Response(null, {
				status: 304,
				headers: { etag, "last-modified": lastModified },
			});
		}
		return new Response(file, {
			headers: { etag, "last-modified": lastModified },
		});
	}
}

function isNotModified(req: Request, etag: string, mtime: number): boolean {
	const ifNoneMatch = req.headers.get("if-none-match");
	if (ifNoneMatch !== null) {
		// weak comparison, as RFC 9110 requires for If-None-Match
		const strip = (tag: string) => tag.trim().replace(/^W\//, "");
		return (
			ifNoneMatch.trim() === "*" ||
			ifNoneMatch.split(",").some((tag) => strip(tag) === strip(etag))
		);
	}
	const ifModifiedSince = req.headers.get("if-modified-since");
	if (ifModifiedSince === null) return false;
	const since = Date.parse(ifModifiedSince);
	// HTTP dates have second precision
	return !Number.isNaN(since) && Math.floor(mtime / 1000) * 1000 <= since;
}

function normalizePrefix(prefix: string): string {
	const withLeading = prefix.startsWith("/") ? prefix : `/${prefix}`;
	return withLeading.endsWith("/") ? withLeading.slice(0, -1) : withLeading;
}
