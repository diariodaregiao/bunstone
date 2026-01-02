import { redis, RedisClient } from "bun";
import { Injectable } from "../injectable";

export type CacheValue = Record<string, unknown>;

export type CacheSetOptions =
  | { permanent: true }
  | { ttlSeconds: number }
  | { ttl: number };

export type CacheAdapterConfig = {
  url: string;
};

@Injectable()
export class CacheAdatper {
  private readonly client: RedisClient;

  constructor(config?: CacheAdapterConfig) {
    this.client = config ? new RedisClient(config.url) : redis;
  }

  async set(
    key: string,
    value: CacheValue,
    options?: CacheSetOptions,
  ): Promise<void> {
    assertValidKey(key);
    const payload = JSON.stringify(value);

    await this.client.set(key, payload);

    if (!options || "permanent" in options) return;

    const ttlSeconds =
      "ttlSeconds" in options ? options.ttlSeconds : options.ttl;
    if (ttlSeconds > 0) {
      await this.client.expire(key, ttlSeconds);
    }
  }

  async get<T extends CacheValue>(key: string): Promise<T> {
    assertValidKey(key);
    const raw = await this.client.get(key);
    if (raw === null) return {} as T;

    const parsed = safeJsonParse(raw);
    if (!isRecord(parsed)) {
      throw new Error(`Cache key "${key}" does not contain a JSON object.`);
    }

    return parsed as T;
  }

  async exists(key: string): Promise<boolean> {
    assertValidKey(key);
    const result = await this.client.exists(key);
    return typeof result === "boolean" ? result : Boolean(result);
  }

  async remove(key: string): Promise<void> {
    assertValidKey(key);
    await this.client.del(key);
  }
}

function assertValidKey(key: string): void {
  const normalized = key.trim();
  if (normalized.length === 0) {
    throw new Error("Cache key cannot be empty.");
  }
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error("Failed to parse cached value as JSON.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
