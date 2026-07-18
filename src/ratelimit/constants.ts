/**
 * Metadados utilizados pelo sistema de rate limit
 */

/** Chave de metadado para configuração de rate limit em métodos */
export const RATELIMIT_METADATA_KEY = "dip:ratelimit";

/** Chave de metadado para configuração de rate limit em controllers */
export const RATELIMIT_CONTROLLER_METADATA_KEY = "dip:ratelimit:controller";

/** Configurações padrão de rate limit */
export const DEFAULT_RATELIMIT_CONFIG = {
	max: 100,
	windowMs: 60000, // 1 minuto
};
