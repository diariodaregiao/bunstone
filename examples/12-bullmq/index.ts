import {
	AppStartup,
	BullMqModule,
	Controller,
	Get,
	Module,
	Process,
	Processor,
	QueryService,
	QueueService,
} from "../../index";
import { Job } from "bullmq";

// 1. Define a Job Processor
@Processor({
	queueName: "mail-queue",
	concurrency: 2,
})
export class MailProcessor {
	@Process("welcome-email")
	async handleWelcomeEmail(job: Job) {
		console.log(`[Worker] Processing welcome email for: ${job.data.email}`);
		// Simulate some work
		await new Promise((resolve) => setTimeout(resolve, 1000));
		console.log(`[Worker] Welcome email sent to ${job.data.email}`);
		return { success: true, recipient: job.data.email };
	}

	@Process()
	async handleGenericJob(job: Job) {
		console.log(`[Worker] Processing generic job: ${job.name}`);
	}
}

// 2. Define a Controller to produce jobs
@Controller("/jobs")
export class JobsController {
	constructor(private readonly queueService: QueueService) {}

	@Get("/add")
	async addJob() {
		const email = `user-${Math.floor(Math.random() * 1000)}@example.com`;
		console.log(`[Controller] Adding welcome-email job for ${email}`);

		await this.queueService.add("mail-queue", "welcome-email", { email });

		return {
			message: "Job added to queue",
			email,
		};
	}
}

// 3. Setup the Application Module
@Module({
	imports: [
		BullMqModule.register({
			host: process.env.REDIS_HOST || "localhost",
			port: Number(process.env.REDIS_PORT) || 6379,
		}),
	],
	controllers: [JobsController],
	providers: [MailProcessor],
})
class AppModule {}

// 4. Start the app
console.log("Starting BullMQ example app...");
console.log("Make sure you have a Redis instance running at localhost:6379");
AppStartup.bootstrap(AppModule);
