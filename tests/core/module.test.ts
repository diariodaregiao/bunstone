import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import { Injectable } from "../../src/core/injectable";
import { compileModules, Module } from "../../src/core/module";

describe("compileModules", () => {
	it("registers providers and controllers from the graph", () => {
		@Injectable()
		class GreetService {
			hello() {
				return "hi";
			}
		}

		@Injectable()
		class GreetController {
			constructor(readonly service: GreetService) {}
		}

		@Module({
			controllers: [GreetController],
			providers: [GreetService],
		})
		class AppModule {}

		const { container, controllers, modules } = compileModules(AppModule);

		expect(modules).toContain(AppModule);
		expect(controllers).toContain(GreetController);
		expect(container.resolve(GreetController).service.hello()).toBe("hi");
	});

	it("merges providers from imported modules into one singleton graph", () => {
		@Injectable()
		class Db {}

		@Module({ providers: [Db] })
		class SharedModule {}

		@Injectable()
		class UsersService {
			constructor(readonly db: Db) {}
		}

		@Module({ imports: [SharedModule], providers: [UsersService] })
		class AppModule {}

		const { container } = compileModules(AppModule);
		expect(container.resolve(UsersService).db).toBe(container.resolve(Db));
	});

	it("visits each module only once with diamond imports", () => {
		@Injectable()
		class Core {}

		@Module({ providers: [Core] })
		class CoreModule {}

		@Module({ imports: [CoreModule] })
		class Left {}

		@Module({ imports: [CoreModule] })
		class Right {}

		@Module({ imports: [Left, Right] })
		class AppModule {}

		const { modules } = compileModules(AppModule);
		expect(modules.filter((m) => m === CoreModule)).toHaveLength(1);
	});

	it("throws when a non-module is imported", () => {
		class NotAModule {}

		@Module({ imports: [NotAModule] })
		class AppModule {}

		expect(() => compileModules(AppModule)).toThrow(/is not a module/);
	});
});
