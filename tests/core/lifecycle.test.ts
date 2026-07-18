import "reflect-metadata";
import { describe, expect, it } from "bun:test";
import { DisposableRegistry } from "../../src/core/disposable";
import type { OnModuleDestroy, OnModuleInit } from "../../src/core/lifecycle";
import { runLifecycle } from "../../src/core/lifecycle";

describe("runLifecycle", () => {
	it("awaits async hooks in order", async () => {
		const calls: string[] = [];

		class A implements OnModuleInit {
			async onModuleInit() {
				await Promise.resolve();
				calls.push("a");
			}
		}
		class B implements OnModuleInit {
			async onModuleInit() {
				calls.push("b");
			}
		}

		await runLifecycle([new A(), new B()], "onModuleInit");
		expect(calls).toEqual(["a", "b"]);
	});

	it("skips instances that do not implement the hook", async () => {
		const calls: string[] = [];
		class WithHook implements OnModuleDestroy {
			onModuleDestroy() {
				calls.push("destroy");
			}
		}
		class Plain {}

		await runLifecycle([new Plain(), new WithHook()], "onModuleDestroy");
		expect(calls).toEqual(["destroy"]);
	});

	it("runs hooks in reverse when requested", async () => {
		const calls: string[] = [];
		const make = (id: string): OnModuleDestroy => ({
			onModuleDestroy() {
				calls.push(id);
			},
		});

		await runLifecycle(
			[make("1"), make("2"), make("3")],
			"onModuleDestroy",
			true,
		);
		expect(calls).toEqual(["3", "2", "1"]);
	});
});

describe("DisposableRegistry", () => {
	it("disposes in reverse registration order", async () => {
		const calls: number[] = [];
		const registry = new DisposableRegistry();
		registry.add(() => void calls.push(1));
		registry.add(() => void calls.push(2));
		registry.add(async () => void calls.push(3));

		await registry.disposeAll();
		expect(calls).toEqual([3, 2, 1]);
	});

	it("runs every disposer even if one throws, then aggregates errors", async () => {
		const calls: number[] = [];
		const registry = new DisposableRegistry();
		registry.add(() => void calls.push(1));
		registry.add(() => {
			throw new Error("boom");
		}, "faulty");
		registry.add(() => void calls.push(3));

		await expect(registry.disposeAll()).rejects.toThrow(AggregateError);
		expect(calls).toEqual([3, 1]);
	});
});
