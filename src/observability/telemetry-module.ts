import { Inject, Injectable, InjectionToken } from "@/core/injectable";
import type { OnModuleDestroy, OnModuleInit } from "@/core/lifecycle";
import type { DynamicModule } from "@/core/module";
import { type TelemetryOptions, TelemetrySdk } from "./telemetry";

export const TELEMETRY_OPTIONS = new InjectionToken<TelemetryOptions>(
	"TelemetryOptions",
);

@Injectable()
export class TelemetryService implements OnModuleInit, OnModuleDestroy {
	private readonly sdk = new TelemetrySdk();

	constructor(
		@Inject(TELEMETRY_OPTIONS) private readonly options: TelemetryOptions,
	) {}

	onModuleInit(): void {
		this.sdk.start(this.options);
	}

	async onModuleDestroy(): Promise<void> {
		await this.sdk.shutdown();
	}
}

export class TelemetryModule {
	static register(options: TelemetryOptions): DynamicModule {
		return {
			module: TelemetryModule,
			global: true,
			providers: [
				{ provide: TELEMETRY_OPTIONS, useValue: options },
				TelemetryService,
			],
		};
	}
}
