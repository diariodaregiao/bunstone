import { timingSafeEqual } from "node:crypto";

export interface OpenApiBasicAuth {
	username: string;
	password: string;
	realm?: string;
}

function unauthorized(realm: string): Response {
	return new Response("Unauthorized", {
		status: 401,
		headers: {
			"www-authenticate": `Basic realm="${realm.replaceAll('"', "")}"`,
			"content-type": "text/plain; charset=utf-8",
		},
	});
}

function safeEqual(a: string, b: string): boolean {
	const left = Buffer.from(a);
	const right = Buffer.from(b);
	if (left.length !== right.length) {
		return timingSafeEqual(left, left) && false;
	}
	return timingSafeEqual(left, right);
}

export function assertOpenApiBasicAuth(
	req: Request,
	auth: OpenApiBasicAuth,
): Response | null {
	const realm = auth.realm ?? "API Docs";
	const header = req.headers.get("authorization");
	if (!header?.startsWith("Basic ")) {
		return unauthorized(realm);
	}

	let decoded: string;
	try {
		decoded = atob(header.slice("Basic ".length).trim());
	} catch {
		return unauthorized(realm);
	}

	const separator = decoded.indexOf(":");
	if (separator < 0) {
		return unauthorized(realm);
	}

	const username = decoded.slice(0, separator);
	const password = decoded.slice(separator + 1);
	const userOk = safeEqual(username, auth.username);
	const passOk = safeEqual(password, auth.password);
	if (!userOk || !passOk) {
		return unauthorized(realm);
	}

	return null;
}
