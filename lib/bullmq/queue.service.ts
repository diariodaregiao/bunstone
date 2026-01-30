import { type JobsOptions, Queue, type RedisOptions } from "bullmq";
import { Injectable } from "../injectable";
import { Logger } from "../utils/logger";

@Injectable()
export class QueueService {
	private readonly logger = new Logger(QueueService.name);
	private readonly queues = new Map<string, Queue>();
	private static redisOptions: RedisOptions;

	static setRedisOptions(options: RedisOptions) {
		QueueService.redisOptions = options;
	}

	async add(queueName: string, jobName: string, data: any, opts?: JobsOptions) {
		const queue = this.getQueue(queueName);
		return await queue.add(jobName, data, opts);
	}

	getQueue(queueName: string): Queue {
		const existingQueue = this.queues.get(queueName);
		if (existingQueue) {
			return existingQueue;
		}

		if (!QueueService.redisOptions) {
			this.logger.error(
				`Redis options not set for BullMQ. Ensure BullMqModule.register() is called in your AppModule imports.`,
			);
			throw new Error("BullMQ Redis options not configured.");
		}

		const queue = new Queue(queueName, {
			connection: QueueService.redisOptions,
		});

		this.queues.set(queueName, queue);
		return queue;
	}

	async closeAll() {
		for (const queue of this.queues.values()) {
			await queue.close();
		}
		this.queues.clear();
	}
}
