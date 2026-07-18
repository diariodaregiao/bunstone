import type { DynamicModule } from "@/core/module";
import { JwtGuard } from "./jwt.guard";
import { JwtService } from "./jwt.service";
import { JWT_OPTIONS, type JwtOptions } from "./jwt.tokens";

export class JwtModule {
	static register(options: JwtOptions): DynamicModule {
		return {
			module: JwtModule,
			global: true,
			providers: [
				{ provide: JWT_OPTIONS, useValue: options },
				JwtService,
				JwtGuard,
			],
		};
	}
}
