import { S3Client } from "bun";
import type { DynamicModule } from "@/core/module";
import { StorageService } from "./storage.service";
import {
	STORAGE_CLIENT,
	type StorageOptions,
	storageClientToken,
	storageToken,
} from "./storage.tokens";

/** Builds the `Bun.S3Client`; options left out fall back to Bun's `S3_*` / `AWS_*` env vars. */
export function createStorageClient(options: StorageOptions = {}): S3Client {
	const { name: _name, publicUrl: _publicUrl, ...connection } = options;
	// undefined entries would override Bun's env fallbacks with "unset"
	const defined = Object.fromEntries(
		Object.entries(connection).filter(([, value]) => value !== undefined),
	);
	return new S3Client(defined);
}

export class StorageModule {
	/**
	 * Registers a storage. Without `name` it provides `StorageService` and
	 * `STORAGE_CLIENT`; with one, `storageToken(name)` (inject it with
	 * `@InjectStorage(name)`) and `storageClientToken(name)`.
	 */
	static register(options: StorageOptions = {}): DynamicModule {
		const clientToken = options.name
			? storageClientToken(options.name)
			: STORAGE_CLIENT;
		const serviceToken = options.name
			? storageToken(options.name)
			: StorageService;
		return {
			module: StorageModule,
			global: true,
			providers: [
				{
					provide: clientToken,
					useFactory: () => createStorageClient(options),
				},
				{
					provide: serviceToken,
					useFactory: (client: S3Client) =>
						new StorageService(client, {
							bucket: options.bucket,
							publicUrl: options.publicUrl,
						}),
					inject: [clientToken],
				},
			],
			exports: [clientToken, serviceToken],
		};
	}
}
