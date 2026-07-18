export interface RateLimitResult {
	allowed: boolean;
	limit: number;
	remaining: number;
	resetAt: number;
}

export interface RateLimitStorage {
	hit(key: string, max: number, windowMs: number): Promise<RateLimitResult>;
	close(): void;
}

interface Bucket {
	count: number;
	resetAt: number;
}

export class MemoryStorage implements RateLimitStorage {
	private readonly buckets = new Map<string, Bucket>();
	private readonly timer: ReturnType<typeof setInterval>;

	constructor(private readonly sweepIntervalMs = 60_000) {
		this.timer = setInterval(() => this.sweep(), this.sweepIntervalMs);
		this.timer.unref?.();
	}

	async hit(
		key: string,
		max: number,
		windowMs: number,
	): Promise<RateLimitResult> {
		const now = Date.now();
		let bucket = this.buckets.get(key);
		if (!bucket || now >= bucket.resetAt) {
			bucket = { count: 0, resetAt: now + windowMs };
			this.buckets.set(key, bucket);
		}
		bucket.count++;
		return {
			allowed: bucket.count <= max,
			limit: max,
			remaining: Math.max(0, max - bucket.count),
			resetAt: bucket.resetAt,
		};
	}

	close(): void {
		clearInterval(this.timer);
		this.buckets.clear();
	}

	private sweep(): void {
		const now = Date.now();
		for (const [key, bucket] of this.buckets) {
			if (now >= bucket.resetAt) this.buckets.delete(key);
		}
	}
}
