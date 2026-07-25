import { createHash, timingSafeEqual } from "node:crypto";

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
	const left = createHash("sha256").update(a, "utf8").digest();
	const right = createHash("sha256").update(b, "utf8").digest();
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

	const decoded = Buffer.from(
		header.slice("Basic ".length).trim(),
		"base64",
	).toString("utf8");

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
