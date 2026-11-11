import { RedisClient } from "bun";
import { type Provider, providerToken } from "@/core/container";
import { Inject, Injectable, InjectionToken } from "@/core/injectable";
import type { OnModuleDestroy } from "@/core/lifecycle";
import type { DynamicModule } from "@/core/module";
import type { GlobalRateLimitOptions, RateLimitConfig } from "./decorator";
import {
	RedisStorage,
	type RedisStorageFailureMode,
	type RedisStorageOptions,
} from "./redis-storage";
import type { RateLimitStorage } from "./storage";

export interface RateLimitModuleOptions extends RateLimitConfig {
	/**
	 * `subtree` (default): this module and every module it imports.
	 * `module`: only controllers declared in the module that imports this.
	 */
	scope?: "subtree" | "module";
}

export interface RateLimitStorageModuleOptions {
	/** Connection URL; ignored when `client` is given. */
	url?: string;
	/**
	 * An existing client to reuse (e.g. the one behind `CACHE_CLIENT`). The
	 * module never closes a client it was handed; whoever created it does.
	 */
	client?: RedisClient;
	onFailure?: RedisStorageFailureMode;
	keyPrefix?: string;
}

export const RATE_LIMIT_MODULE_OPTIONS =
	new InjectionToken<RateLimitModuleOptions>("RateLimitModuleOptions");

export const RATE_LIMIT_STORAGE_OPTIONS =
	new InjectionToken<RateLimitStorageModuleOptions>("RateLimitStorageOptions");

export const RATE_LIMIT_STORAGE = new InjectionToken<RateLimitStorage>(
	"RateLimitStorage",
);

@Injectable()
class RedisRateLimitStorage extends RedisStorage implements OnModuleDestroy {
	private readonly ownsClient: boolean;

	constructor(
		@Inject(RATE_LIMIT_STORAGE_OPTIONS)
		options: RateLimitStorageModuleOptions,
	) {
		const client =
			options.client ??
			(options.url ? new RedisClient(options.url) : new RedisClient());
		super({
			client,
			keyPrefix: options.keyPrefix,
			onFailure: options.onFailure,
		} satisfies RedisStorageOptions);
		this.ownsClient = options.client === undefined;
	}

	/** The container owns this storage; the HTTP server never closes it. */
	onModuleDestroy(): void {
		if (this.ownsClient) this.close();
	}
}

export class RateLimitModule {
	static register(options: RateLimitModuleOptions): DynamicModule {
		return {
			module: RateLimitModule,
			providers: [{ provide: RATE_LIMIT_MODULE_OPTIONS, useValue: options }],
		};
	}

	static registerStorage(
		options: RateLimitStorageModuleOptions = {},
	): DynamicModule {
		return {
			module: RateLimitModule,
			global: true,
			providers: [
				{ provide: RATE_LIMIT_STORAGE_OPTIONS, useValue: options },
				RedisRateLimitStorage,
				{
					provide: RATE_LIMIT_STORAGE,
					useFactory: (storage: RedisRateLimitStorage) => storage,
					inject: [RedisRateLimitStorage],
				},
			],
			exports: [RATE_LIMIT_STORAGE],
		};
	}
}

export function extractRateLimitModuleConfig(
	entry: DynamicModule,
): RateLimitModuleOptions | undefined {
	if (entry.module !== RateLimitModule) return undefined;
	for (const provider of entry.providers ?? []) {
		if (providerToken(provider as Provider) !== RATE_LIMIT_MODULE_OPTIONS) {
			continue;
		}
		if (
			typeof provider === "object" &&
			provider !== null &&
			"useValue" in provider
		) {
			return provider.useValue as RateLimitModuleOptions;
		}
	}
	return undefined;
}

export function extractRateLimitModuleScope(
	entry: DynamicModule,
): "subtree" | "module" {
	const config = extractRateLimitModuleConfig(entry);
	return config?.scope === "module" ? "module" : "subtree";
}

export function isRateLimitModuleImport(
	entry: unknown,
): entry is DynamicModule {
	return (
		typeof entry === "object" &&
		entry !== null &&
		"module" in entry &&
		(entry as DynamicModule).module === RateLimitModule
	);
}

/** Strip module-only fields before enforcement. */
export function toRateLimitConfig(
	options: RateLimitModuleOptions | GlobalRateLimitOptions,
): RateLimitConfig {
	const {
		skip: _skip,
		scope: _scope,
		prefixes: _prefixes,
		path: _path,
		...config
	} = options as RateLimitModuleOptions & {
		skip?: readonly string[];
		prefixes?: readonly unknown[];
		path?: string;
	};
	return config;
}
