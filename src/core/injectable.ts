import "reflect-metadata";

export type Constructor<T = unknown> = new (...args: any[]) => T;

export class InjectionToken<T = unknown> {
	declare readonly _brand?: T;

	constructor(readonly description: string) {}

	toString(): string {
		return `InjectionToken(${this.description})`;
	}
}

export type Token<T = unknown> = Constructor<T> | InjectionToken<T>;

export const INJECTABLE_METADATA = "bunstone:injectable";
export const INJECT_TOKENS_METADATA = "bunstone:inject-tokens";

export function Injectable(): ClassDecorator {
	return (target) => {
		Reflect.defineMetadata(INJECTABLE_METADATA, true, target);
	};
}

export function Inject(token: Token): ParameterDecorator {
	return (target, _propertyKey, index) => {
		const overrides: Map<number, Token> =
			Reflect.getOwnMetadata(INJECT_TOKENS_METADATA, target) ?? new Map();
		overrides.set(index, token);
		Reflect.defineMetadata(INJECT_TOKENS_METADATA, overrides, target);
	};
}

export function isInjectable(target: unknown): boolean {
	return (
		typeof target === "function" &&
		Reflect.getMetadata(INJECTABLE_METADATA, target) === true
	);
}

export function tokenName(token: Token): string {
	if (token instanceof InjectionToken) return token.toString();
	return (token as Constructor)?.name ?? String(token);
}
