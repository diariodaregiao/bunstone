/**
 * Interface que define o contrato para storage de rate limiting.
 * Suporta implementações em memória e Redis.
 */

/**
 * Informações de consumo de rate limit
 */
export interface RateLimitInfo {
	/** Total de requisições permitidas no window */
	totalHits: number;
	/** Quantidade de requisições restantes */
	remaining: number;
	/** Timestamp (ms) quando o window reseta */
	resetTime: number;
}

/**
 * Interface base para storage de rate limit
 */
export interface RateLimitStorage {
	/**
	 * Incrementa o contador para uma chave específica
	 * @param key Chave única (IP + endpoint)
	 * @param windowMs Janela de tempo em milissegundos
	 * @returns Informações atualizadas de rate limit
	 */
	increment(
		key: string,
		windowMs: number,
	): Promise<RateLimitInfo> | RateLimitInfo;

	/**
	 * Decrementa o contador (útil quando requisição é rejeitada antes do processamento)
	 * @param key Chave única
	 */
	decrement(key: string): Promise<void> | void;

	/**
	 * Reseta o contador para uma chave específica
	 * @param key Chave única
	 */
	resetKey(key: string): Promise<void> | void;

	/**
	 * Fecha a conexão (para storage externo como Redis)
	 */
	close?(): Promise<void> | void;
}
