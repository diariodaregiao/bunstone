import type {
	RateLimitInfo,
	RateLimitStorage,
} from "../interfaces/storage.interface";

/**
 * Interface mínima do cliente Redis necessária para o rate limit
 * Compatível com ioredis, node-redis, e outros
 */
export interface RedisClientLike {
	multi(): {
		incr(key: string): any;
		pexpire(key: string, milliseconds: number): any;
		pttl(key: string): any;
		exec(): Promise<[Error | null, (string | number | null)[]] | null>;
	};
	decr(key: string): Promise<number>;
	del(key: string): Promise<number>;
	quit?(): Promise<void>;
}

/**
 * Implementação Redis do storage de rate limit.
 * Ideal para aplicações multi-instance ou produção.
 *
 * Usa operações atômicas Redis (MULTI/EXEC) para garantir consistência.
 */
export class RedisStorage implements RateLimitStorage {
	private prefix = "ratelimit:";

	constructor(
		private redisClient: RedisClientLike,
		prefix?: string,
	) {
		if (prefix) {
			this.prefix = prefix;
		}
	}

	/**
	 * Gera a chave Redis completa
	 */
	private getKey(key: string): string {
		return `${this.prefix}${key}`;
	}

	/**
	 * Incrementa o contador usando operações atômicas Redis
	 */
	async increment(key: string, windowMs: number): Promise<RateLimitInfo> {
		const fullKey = this.getKey(key);
		const now = Date.now();

		// Usa MULTI para operações atômicas
		const multi = this.redisClient.multi();
		multi.incr(fullKey);
		multi.pexpire(fullKey, windowMs);
		multi.pttl(fullKey);

		const result = await multi.exec();

		if (!result) {
			throw new Error("Failed to execute Redis transaction");
		}

		const results = result[1];
		if (!results || !Array.isArray(results)) {
			throw new Error("Invalid Redis transaction response");
		}

		// results[0] = incr result: [Error | null, string | number | null]
		// results[1] = pexpire result
		// results[2] = pttl result: [Error | null, number]
		const countResult = results[0] as unknown as [
			Error | null,
			string | number | null,
		];
		const ttlResult = results[2] as unknown as
			| [Error | null, number]
			| undefined;

		const incrError = countResult[0];
		const count = countResult[1];

		if (incrError) {
			throw incrError;
		}

		const ttl = ttlResult?.[1] ?? -1;

		// Se TTL for -1, significa que a chave foi criada agora
		// Se TTL for -2, a chave não existe
		let resetTime: number;
		if (typeof ttl === "number" && ttl > 0) {
			resetTime = now + ttl;
		} else {
			resetTime = now + windowMs;
		}

		return {
			totalHits:
				typeof count === "string"
					? Number.parseInt(count, 10)
					: (count as number) || 1,
			remaining: Infinity, // Será calculado pelo serviço
			resetTime,
		};
	}

	/**
	 * Decrementa o contador
	 */
	async decrement(key: string): Promise<void> {
		const fullKey = this.getKey(key);
		await this.redisClient.decr(fullKey);
	}

	/**
	 * Reseta o contador para uma chave
	 */
	async resetKey(key: string): Promise<void> {
		const fullKey = this.getKey(key);
		await this.redisClient.del(fullKey);
	}

	/**
	 * Fecha a conexão Redis (opcional)
	 */
	async close(): Promise<void> {
		if (this.redisClient.quit) {
			await this.redisClient.quit();
		}
	}
}
