import type { RedisOptions } from "bullmq";
import { Module } from "../module";
import { QueueService } from "./queue.service";

@Module({
	providers: [QueueService],
	exports: [QueueService],
	global: true,
})
export class BullMqModule {
	static register(options: RedisOptions) {
		QueueService.setRedisOptions(options);
		return BullMqModule;
	}
}
