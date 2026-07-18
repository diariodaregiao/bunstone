import "reflect-metadata";

/** Any newable class. */
export type Constructor<T = unknown> = new (...args: any[]) => T;

/**
 * A typed injection token for values that have no class to key on
 * (interfaces, config objects, primitives).
 *
 * @example
 * ```ts
 * export const MAILER = new InjectionToken<Mailer>("Mailer");
 * // provide:  { provide: MAILER, useClass: SmtpMailer }
 * // inject:   constructor(@Inject(MAILER) private mailer: Mailer) {}
 * ```
 */
export class InjectionToken<T = unknown> {
	/** Phantom field so TypeScript can infer the provided type. Never assigned. */
	declare readonly _brand?: T;

	constructor(readonly description: string) {}

	toString(): string {
		return `InjectionToken(${this.description})`;
	}
}

/** Anything the container can resolve: a class or an {@link InjectionToken}. */
export type Token<T = unknown> = Constructor<T> | InjectionToken<T>;

export const INJECTABLE_METADATA = "bunstone:injectable";
export const INJECT_TOKENS_METADATA = "bunstone:inject-tokens";

/**
 * Marks a class as injectable so the DI container can construct it and so
 * `emitDecoratorMetadata` records its constructor parameter types.
 */
export function Injectable(): ClassDecorator {
	return (target) => {
		Reflect.defineMetadata(INJECTABLE_METADATA, true, target);
	};
}

/**
 * Overrides the token used to resolve a constructor parameter. Required when the
 * parameter's type is an interface or a value keyed by an {@link InjectionToken}.
 */
export function Inject(token: Token): ParameterDecorator {
	return (target, _propertyKey, index) => {
		const overrides: Map<number, Token> =
			Reflect.getOwnMetadata(INJECT_TOKENS_METADATA, target) ?? new Map();
		overrides.set(index, token);
		Reflect.defineMetadata(INJECT_TOKENS_METADATA, overrides, target);
	};
}

/** True when `target` is a class decorated with {@link Injectable}. */
export function isInjectable(target: unknown): boolean {
	return (
		typeof target === "function" &&
		Reflect.getMetadata(INJECTABLE_METADATA, target) === true
	);
}

/** Human-readable name for a token, used in error messages. */
export function tokenName(token: Token): string {
	if (token instanceof InjectionToken) return token.toString();
	return (token as Constructor)?.name ?? String(token);
}
