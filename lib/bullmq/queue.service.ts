import { type JobsOptions, Queue, type RedisOptions } from "bullmq";
import { BullMQError } from "../errors";
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
			throw BullMQError.notConfigured();
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
