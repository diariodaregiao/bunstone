import { Injectable } from "../injectable";
import type { HttpRequest } from "../types/http-request";
import type {
	RateLimitInfo,
	RateLimitStorage,
} from "./interfaces/storage.interface";
import { MemoryStorage } from "./storage/memory.storage";

/**
 * Exceção lançada quando o rate limit é excedido
 */
export class RateLimitExceededException extends Error {
	constructor(
		public readonly limit: number,
		public readonly resetTime: number,
	) {
		super(
			`Rate limit exceeded. Limit: ${limit}. Retry after ${new Date(resetTime).toISOString()}`,
		);
		this.name = "RateLimitExceededException";
	}
}

/**
 * Configuração de rate limit por endpoint/controller
 */
export interface RateLimitConfig {
	/** Máximo de requisições permitidas na janela de tempo */
	max: number;
	/** Janela de tempo em milissegundos */
	windowMs: number;
	/** Mensagem de erro customizada (opcional) */
	message?: string;
	/** Storage customizado (opcional, padrão é MemoryStorage) */
	storage?: RateLimitStorage;
	/** Função para extrair a chave de identificação (padrão: IP + método + path) */
	keyGenerator?: (req: HttpRequest) => string;
	/** Headers customizados para skip rate limit */
	skipHeader?: string;
	/** Função para determinar se deve pular o rate limit */
	skip?: (req: HttpRequest) => boolean;
}

/**
 * Headers retornados nas respostas de rate limit
 */
export interface RateLimitHeaders {
	"X-RateLimit-Limit": string;
	"X-RateLimit-Remaining": string;
	"X-RateLimit-Reset": string;
	"Retry-After"?: string;
}

/**
 * Resultado do processamento de rate limit
 */
export interface RateLimitResult {
	/** Se a requisição está permitida */
	allowed: boolean;
	/** Headers de rate limit para adicionar na resposta */
	headers: RateLimitHeaders;
	/** Informações de rate limit */
	info: RateLimitInfo;
}

/**
 * Serviço principal de rate limiting.
 * Gerencia a lógica de incremento, verificação e geração de headers.
 */
@Injectable()
export class RateLimitService {
	private defaultStorage: RateLimitStorage = new MemoryStorage();

	/**
	 * Processa o rate limit para uma requisição
	 * @param req Requisição HTTP
	 * @param config Configuração de rate limit
	 * @returns Resultado do processamento
	 */
	async process(
		req: HttpRequest,
		config: RateLimitConfig,
	): Promise<RateLimitResult> {
		// Verifica se deve pular o rate limit
		if (config.skip?.(req)) {
			return this.createSkipResult(config.max);
		}

		// Verifica header de skip
		if (config.skipHeader && req.headers[config.skipHeader.toLowerCase()]) {
			return this.createSkipResult(config.max);
		}

		const storage = config.storage || this.defaultStorage;
		const key = this.generateKey(req, config.keyGenerator);

		// Incrementa o contador
		const info = await storage.increment(key, config.windowMs);

		// Calcula remaining
		info.remaining = Math.max(0, config.max - info.totalHits);

		// Verifica se excedeu o limite
		const allowed = info.totalHits <= config.max;

		// Gera os headers
		const headers = this.generateHeaders(info, config.max, allowed);

		return {
			allowed,
			headers,
			info,
		};
	}

	/**
	 * Decrementa o contador (útil quando requisição é rejeitada)
	 */
	async decrement(req: HttpRequest, config: RateLimitConfig): Promise<void> {
		const storage = config.storage || this.defaultStorage;
		const key = this.generateKey(req, config.keyGenerator);
		await storage.decrement(key);
	}

	/**
	 * Gera a chave de identificação para o rate limit
	 * Padrão: IP + Método + Path
	 */
	private generateKey(
		req: HttpRequest,
		keyGenerator?: (req: HttpRequest) => string,
	): string {
		if (keyGenerator) {
			return keyGenerator(req);
		}

		// Extrai IP considerando proxies
		const ip = this.extractIp(req);

		// Obtém método e path do contexto Elysia
		// Elysia adiciona dinamicamente
		const method = (req as any).request?.method || (req as any).method || "GET";
		// Elysia adiciona dinamicamente
		const path =
			(req as any).request?.url || (req as any).path || (req as any).url || "/";

		// Cria chave única: IP + método + path
		return `${ip}:${method}:${path}`;
	}

	/**
	 * Extrai o IP real da requisição considerando proxies
	 */
	private extractIp(req: HttpRequest): string {
		// Headers comuns de proxy
		const forwarded = req.headers["x-forwarded-for"];
		if (forwarded && typeof forwarded === "string") {
			// Pega o primeiro IP da lista
			const firstIp = forwarded.split(",")[0];
			if (firstIp) {
				return firstIp.trim();
			}
		}

		const realIp = req.headers["x-real-ip"];
		if (realIp && typeof realIp === "string") {
			return realIp;
		}

		// Fallback para IP do Bun/Elysia
		const ip = (req as any).ip || (req as any).request?.ip;
		if (ip) {
			return ip;
		}

		// Último recurso
		return "unknown";
	}

	/**
	 * Gera os headers de rate limit
	 */
	private generateHeaders(
		info: RateLimitInfo,
		max: number,
		allowed: boolean,
	): RateLimitHeaders {
		const headers: RateLimitHeaders = {
			"X-RateLimit-Limit": max.toString(),
			"X-RateLimit-Remaining": info.remaining.toString(),
			"X-RateLimit-Reset": Math.ceil(info.resetTime / 1000).toString(),
		};

		// Adiciona Retry-After se excedeu o limite
		if (!allowed) {
			const retryAfterSeconds = Math.ceil((info.resetTime - Date.now()) / 1000);
			headers["Retry-After"] = Math.max(0, retryAfterSeconds).toString();
		}

		return headers;
	}

	/**
	 * Cria resultado de skip (quando rate limit é ignorado)
	 */
	private createSkipResult(max: number): RateLimitResult {
		return {
			allowed: true,
			headers: {
				"X-RateLimit-Limit": max.toString(),
				"X-RateLimit-Remaining": max.toString(),
				"X-RateLimit-Reset": "0",
			},
			info: {
				totalHits: 0,
				remaining: max,
				resetTime: Date.now(),
			},
		};
	}

	/**
	 * Retorna o storage padrão (MemoryStorage)
	 */
	getDefaultStorage(): RateLimitStorage {
		return this.defaultStorage;
	}
}
