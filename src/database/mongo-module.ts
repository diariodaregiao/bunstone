import type { DynamicModule } from "@/core/module";
import { MongoService } from "./mongo.service";
import { MONGO_OPTIONS, type MongoModuleInput } from "./mongo.tokens";

export class MongoModule {
	static register(input: MongoModuleInput): DynamicModule {
		return {
			module: MongoModule,
			global: true,
			providers: [
				{
					provide: MONGO_OPTIONS,
					useValue: typeof input === "string" ? { uri: input } : input,
				},
				MongoService,
			],
			exports: [MONGO_OPTIONS, MongoService],
		};
	}
}
