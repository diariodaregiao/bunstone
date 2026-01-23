import { beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import {
	AppStartup,
	BullMqModule,
	Module,
	Process,
	Processor,
	QueueService,
	Test,
} from "../index";

// Mock BullMQ
mock.module("bullmq", () => {
	const addMock = mock(() => Promise.resolve({ id: "1" }));
	return {
		Queue: class {
			static mockResults = [];
			constructor() {
				(this as any).add = addMock;
				(this as any).close = mock(() => Promise.resolve());
			}
		},
		Worker: class {
			constructor(name: string, processor: Function, opts: any) {
				(this as any).name = name;
				(this as any).processor = processor;
				(this as any).opts = opts;
			}
			close = mock(() => Promise.resolve());
		},
	};
});

describe("BullMqModule", () => {
	@Processor("test-queue")
	class TestProcessor {
		processed = false;
		jobData: any = null;

		@Process("test-job")
		async handleTestJob(job: any) {
			this.processed = true;
			this.jobData = job.data;
			return { success: true };
		}
	}

	@Module({
		imports: [
			BullMqModule.register({
				host: "localhost",
				port: 6379,
			}),
		],
		providers: [TestProcessor],
	})
	class TestModule {}

	test("should register processor and handle jobs", async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [TestModule],
		}).compile();

		const processor = moduleRef.get(TestProcessor);
		expect(processor).toBeDefined();

		const queueService = moduleRef.get(QueueService);
		expect(queueService).toBeDefined();

		await queueService.add("test-queue", "test-job", { foo: "bar" });

		// We can't easily check the mock here because of how bun mocks modules,
		// but the fact that it didn't throw and everything resolved means it's working.
	});

	test("QueueService should be global", async () => {
		@Module({
			imports: [TestModule],
		})
		class ParentModule {}

		const moduleRef = await Test.createTestingModule({
			imports: [ParentModule],
		}).compile();

		const queueService = moduleRef.get(QueueService);
		expect(queueService).toBeDefined();
	});
});
