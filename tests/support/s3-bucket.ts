/**
 * Creates and deletes buckets for the storage e2e suites. Bun's S3 client only
 * addresses objects, so the bucket-level calls are signed here (AWS SigV4).
 */
import { S3Client } from "bun";
import { S3_TEST } from "./services";

const encoder = new TextEncoder();

async function hmac(
	key: Uint8Array<ArrayBuffer>,
	data: string,
): Promise<Uint8Array<ArrayBuffer>> {
	const imported = await crypto.subtle.importKey(
		"raw",
		key,
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	return new Uint8Array(
		await crypto.subtle.sign("HMAC", imported, encoder.encode(data)),
	);
}

const hex = (bytes: Uint8Array) =>
	[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

async function sha256(data: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", encoder.encode(data));
	return hex(new Uint8Array(digest));
}

async function bucketRequest(
	method: "PUT" | "DELETE",
	bucket: string,
): Promise<Response> {
	const { endpoint, accessKeyId, secretAccessKey, region } = S3_TEST;
	const url = new URL(`/${bucket}`, endpoint);
	const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
	const day = amzDate.slice(0, 8);
	const payloadHash = await sha256("");
	const headers: Record<string, string> = {
		host: url.host,
		"x-amz-content-sha256": payloadHash,
		"x-amz-date": amzDate,
	};
	const names = Object.keys(headers).sort();
	const canonical = [
		method,
		url.pathname,
		"",
		...names.map((name) => `${name}:${headers[name]}`),
		"",
		names.join(";"),
		payloadHash,
	].join("\n");
	const scope = `${day}/${region}/s3/aws4_request`;
	const toSign = [
		"AWS4-HMAC-SHA256",
		amzDate,
		scope,
		await sha256(canonical),
	].join("\n");
	let key = await hmac(encoder.encode(`AWS4${secretAccessKey}`), day);
	for (const part of [region, "s3", "aws4_request"]) {
		key = await hmac(key, part);
	}
	const signature = hex(await hmac(key, toSign));
	const { host: _host, ...sent } = headers;
	return fetch(url, {
		method,
		headers: {
			...sent,
			authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${names.join(";")}, Signature=${signature}`,
		},
	});
}

export async function createBucket(bucket: string): Promise<void> {
	const response = await bucketRequest("PUT", bucket);
	if (!response.ok) {
		throw new Error(
			`create bucket ${bucket}: ${response.status} ${await response.text()}`,
		);
	}
}

/** Empties the bucket and deletes it. */
export async function deleteBucket(bucket: string): Promise<void> {
	const client = new S3Client({ ...S3_TEST, bucket });
	for (;;) {
		const page = await client.list({ maxKeys: 1000 });
		const keys = (page.contents ?? []).map((entry) => entry.key);
		if (keys.length === 0) break;
		await Promise.all(keys.map((key) => client.delete(key)));
	}
	const response = await bucketRequest("DELETE", bucket);
	if (!response.ok && response.status !== 404) {
		throw new Error(
			`delete bucket ${bucket}: ${response.status} ${await response.text()}`,
		);
	}
}

/** A bucket name unique to this run (lowercase, under 63 characters). */
export function uniqueBucket(label: string): string {
	return `bunstone-${label}-${Bun.randomUUIDv7().slice(-12)}`.toLowerCase();
}
