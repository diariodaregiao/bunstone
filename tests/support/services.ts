/**
 * Helpers for suites that need a real service.
 *
 * A silently skipped suite reads exactly like a passing one, which is how an
 * integration regression slips through unnoticed. Every skip here announces
 * itself on stderr so a green run is never mistaken for a covered one.
 */

export const RABBITMQ_URI =
	process.env.RABBITMQ_URI ?? "amqp://guest:guest@localhost:5672";

export const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

export const MONGO_URI =
	process.env.MONGO_URI ??
	"mongodb://root:root@localhost:27017/?authSource=admin";

function announce(service: string, target: string, reason?: unknown): void {
	const detail = reason instanceof Error ? ` (${reason.message})` : "";
	console.warn(
		`\n  ⚠ SKIPPING ${service} integration tests: ${target} is unreachable${detail}.\n`,
	);
}

export async function rabbitReachable(uri = RABBITMQ_URI): Promise<boolean> {
	try {
		const amqp = await import("amqplib");
		const connection = await amqp.connect(uri);
		await connection.close();
		return true;
	} catch (error) {
		announce("RabbitMQ", uri, error);
		return false;
	}
}

export async function redisReachable(url = REDIS_URL): Promise<boolean> {
	try {
		const { RedisClient } = await import("bun");
		const client = new RedisClient(url);
		await client.set("bunstone:reachable", "1");
		await client.del("bunstone:reachable");
		client.close();
		return true;
	} catch (error) {
		announce("Redis/Valkey", url, error);
		return false;
	}
}

export async function mongoReachable(uri = MONGO_URI): Promise<boolean> {
	try {
		const { MongoClient } = await import("mongodb");
		const client = new MongoClient(uri, { serverSelectionTimeoutMS: 1500 });
		await client.connect();
		await client.close();
		return true;
	} catch (error) {
		announce("MongoDB", uri, error);
		return false;
	}
}

/** MinIO (or any S3 endpoint) for the storage suites; `S3_TEST_*` overrides it. */
export const S3_TEST = {
	endpoint: process.env.S3_TEST_ENDPOINT ?? "http://localhost:9000",
	accessKeyId: process.env.S3_TEST_ACCESS_KEY_ID ?? "minioadmin",
	secretAccessKey: process.env.S3_TEST_SECRET_ACCESS_KEY ?? "minioadmin",
	region: process.env.S3_TEST_REGION ?? "us-east-1",
};

export async function minioReachable(
	endpoint = S3_TEST.endpoint,
): Promise<boolean> {
	try {
		// MinIO's liveness probe; any other S3 endpoint still answers the request
		const response = await fetch(new URL("/minio/health/live", endpoint), {
			signal: AbortSignal.timeout(1500),
		});
		await response.body?.cancel();
		return true;
	} catch (error) {
		announce("S3/MinIO", endpoint, error);
		return false;
	}
}
