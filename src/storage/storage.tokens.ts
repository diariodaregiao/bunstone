import type { S3Client, S3Options } from "bun";
import { Inject, InjectionToken } from "@/core/injectable";
import type { StorageService } from "./storage.service";

/**
 * Connection settings, passed to `Bun.S3Client` as they are. Anything left out
 * falls back to Bun's environment variables (`S3_ACCESS_KEY_ID`,
 * `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`,
 * `S3_SESSION_TOKEN`, or their `AWS_*` equivalents).
 */
export type StorageConnectionOptions = Pick<
	S3Options,
	| "endpoint"
	| "bucket"
	| "region"
	| "accessKeyId"
	| "secretAccessKey"
	| "sessionToken"
	| "virtualHostedStyle"
	| "acl"
	| "storageClass"
	| "partSize"
	| "queueSize"
	| "retry"
	| "requestPayer"
>;

export interface StorageOptions extends StorageConnectionOptions {
	/**
	 * Registers a named storage next to the default one, injected with
	 * `@InjectStorage(name)`. Omit it for the default `StorageService`.
	 */
	name?: string;
	/**
	 * Base URL the objects are publicly reachable at: a public bucket, an R2
	 * custom domain or a CDN in front of the bucket. Enables `url(key)`.
	 */
	publicUrl?: string;
}

/** The raw `Bun.S3Client` of the default storage. */
export const STORAGE_CLIENT = new InjectionToken<S3Client>("StorageClient");

const serviceTokens = new Map<string, InjectionToken<StorageService>>();
const clientTokens = new Map<string, InjectionToken<S3Client>>();

/** The token a named storage's `StorageService` is registered under. */
export function storageToken(name: string): InjectionToken<StorageService> {
	let token = serviceTokens.get(name);
	if (!token) {
		token = new InjectionToken<StorageService>(`StorageService:${name}`);
		serviceTokens.set(name, token);
	}
	return token;
}

/** The token a named storage's raw `Bun.S3Client` is registered under. */
export function storageClientToken(name: string): InjectionToken<S3Client> {
	let token = clientTokens.get(name);
	if (!token) {
		token = new InjectionToken<S3Client>(`StorageClient:${name}`);
		clientTokens.set(name, token);
	}
	return token;
}

/** Injects the `StorageService` of a storage registered with `name`. */
export function InjectStorage(name: string): ParameterDecorator {
	return Inject(storageToken(name));
}
