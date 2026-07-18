import { describe, expect, it } from "bun:test";
import { generate, toKebabCase, toPascalCase } from "@/cli/generate";

describe("cli codegen", () => {
	it("converts names to pascal and kebab case", () => {
		expect(toPascalCase("user-profile")).toBe("UserProfile");
		expect(toKebabCase("UserProfile")).toBe("user-profile");
	});

	it("generates a controller", () => {
		const file = generate("controller", "user-profile");
		expect(file.path).toBe("user-profile.controller.ts");
		expect(file.content).toContain("export class UserProfileController");
		expect(file.content).toContain('@Controller("user-profile")');
	});

	it("generates a service", () => {
		const file = generate("service", "billing");
		expect(file.path).toBe("billing.service.ts");
		expect(file.content).toContain("@Injectable()");
		expect(file.content).toContain("export class BillingService");
	});

	it("generates a module", () => {
		const file = generate("module", "orders");
		expect(file.path).toBe("orders.module.ts");
		expect(file.content).toContain("export class OrdersModule");
	});
});
