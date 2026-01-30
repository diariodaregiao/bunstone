import "reflect-metadata";
import type { HttpRequest } from "../types/http-request";
import { RATELIMIT_METADATA_KEY } from "./constants";
import type { RateLimitStorage } from "./interfaces/storage.interface";
import type { RateLimitConfig } from "./ratelimit.service";

/**
 * Opções para o decorator @RateLimit
 */
export interface RateLimitOptions {
	/** Máximo de requisições permitidas na janela de tempo (padrão: 100) */
	max?: number;
	/** Janela de tempo em milissegundos (padrão: 60000 = 1 minuto) */
	windowMs?: number;
	/** Mensagem de erro customizada quando excede o limite */
	message?: string;
	/** Storage customizado (padrão: MemoryStorage) */
	storage?: RateLimitStorage;
	/** Função para extrair a chave de identificação */
	keyGenerator?: (req: HttpRequest) => string;
	/** Header que permite pular o rate limit */
	skipHeader?: string;
	/** Função que determina se deve pular o rate limit */
	skip?: (req: HttpRequest) => boolean;
}

/**
 * Configuração interna completa de rate limit
 */
export interface RateLimitMetadata extends RateLimitConfig {
	enabled: boolean;
}

/**
 * Decorator para aplicar rate limiting em métodos de controller.
 *
 * @param options Opções de configuração do rate limit
 *
 * @example
 * ```typescript
 * @Controller('api')
 * class MyController {
 *   @Get('data')
 *   @RateLimit({ max: 100, windowMs: 60000 }) // 100 reqs/minuto
 *   getData() {
 *     return { data: [] };
 *   }
 *
 *   @Post('sensitive')
 *   @RateLimit({ max: 5, windowMs: 60000 }) // Mais restritivo
 *   postSensitive() {
 *     return { success: true };
 *   }
 * }
 * ```
 */
export function RateLimit(options: RateLimitOptions = {}): MethodDecorator {
	return (
		_target: object,
		_propertyKey: string | symbol,
		descriptor: PropertyDescriptor,
	) => {
		const config: RateLimitMetadata = {
			enabled: true,
			max: options.max ?? 100,
			windowMs: options.windowMs ?? 60000,
			message: options.message,
			storage: options.storage,
			keyGenerator: options.keyGenerator,
			skipHeader: options.skipHeader,
			skip: options.skip,
		};

		Reflect.defineMetadata(RATELIMIT_METADATA_KEY, config, descriptor.value);
		return descriptor;
	};
}
