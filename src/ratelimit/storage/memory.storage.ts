import type {
	RateLimitInfo,
	RateLimitStorage,
} from "../interfaces/storage.interface";

/**
 * Entry de rate limit armazenada
 */
interface RateLimitEntry {
	count: number;
	resetTime: number;
}

/**
 * Implementação em memória do storage de rate limit.
 * Ideal para aplicações single-instance ou desenvolvimento.
 *
 * Limpa automaticamente entradas expiradas a cada 5 minutos.
 */
export class MemoryStorage implements RateLimitStorage {
	private storage = new Map<string, RateLimitEntry>();
	private cleanupInterval: Timer | null = null;

	constructor() {
		// Limpa entradas expiradas a cada 5 minutos
		this.cleanupInterval = setInterval(
			() => {
				const now = Date.now();
				for (const [key, entry] of this.storage.entries()) {
					if (entry.resetTime <= now) {
						this.storage.delete(key);
					}
				}
			},
			5 * 60 * 1000,
		);
	}

	/**
	 * Incrementa o contador para uma chave específica
	 */
	increment(key: string, windowMs: number): RateLimitInfo {
		const now = Date.now();
		const entry = this.storage.get(key);

		if (!entry || entry.resetTime <= now) {
			// Nova janela ou entrada expirada
			const newEntry: RateLimitEntry = {
				count: 1,
				resetTime: now + windowMs,
			};
			this.storage.set(key, newEntry);

			return {
				totalHits: 1,
				remaining: Infinity, // Será calculado pelo serviço baseado no max
				resetTime: newEntry.resetTime,
			};
		}

		// Incrementa contador existente
		entry.count++;

		return {
			totalHits: entry.count,
			remaining: Infinity, // Será calculado pelo serviço
			resetTime: entry.resetTime,
		};
	}

	/**
	 * Decrementa o contador (útil para requisições rejeitadas)
	 */
	decrement(key: string): void {
		const entry = this.storage.get(key);
		if (entry && entry.count > 0) {
			entry.count--;
		}
	}

	/**
	 * Reseta o contador para uma chave
	 */
	resetKey(key: string): void {
		this.storage.delete(key);
	}

	/**
	 * Limpa todas as entradas e para o intervalo de cleanup
	 */
	close(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = null;
		}
		this.storage.clear();
	}
}
