import { describe, expect, it } from "bun:test";
import { Controller, Get, Injectable, Module, Test } from "../index";

@Injectable()
class RealService {
	getValue() {
		return "real";
	}
}

@Controller("/test")
class TestController {
	constructor(private readonly service: RealService) {}

	@Get("/")
	async get() {
		return { value: this.service.getValue() };
	}
}

@Module({
	controllers: [TestController],
	providers: [RealService],
})
class AppModule {}

describe("TestingModule", () => {
	it("should compile and resolve providers", async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		const service = moduleRef.get(RealService);
		expect(service).toBeInstanceOf(RealService);
		expect(service.getValue()).toBe("real");
	});

	it("should override providers", async () => {
		const mockService = {
			getValue: () => "mocked",
		};

		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		})
			.overrideProvider(RealService)
			.useValue(mockService)
			.compile();

		const service = moduleRef.get(RealService);
		expect(service.getValue()).toBe("mocked");
	});

	it("should perform E2E requests with TestApp", async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		const app = await moduleRef.createTestApp();
		const response = await app.get("/test");
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toEqual({ value: "real" });
	});

	it("should reflect overrides in TestApp", async () => {
		const mockService = {
			getValue: () => "mocked-e2e",
		};

		const moduleRef = await Test.createTestingModule({
			imports: [AppModule],
		})
			.overrideProvider(RealService)
			.useValue(mockService)
			.compile();

		const app = await moduleRef.createTestApp();
		const response = await app.get("/test");
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data).toEqual({ value: "mocked-e2e" });
	});
});
