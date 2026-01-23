export abstract class BunstoneError extends Error {
	public readonly code: string;
	public readonly suggestion?: string;
	public readonly context?: any;

	constructor(
		message: string,
		code: string,
		suggestion?: string,
		context?: any,
	) {
		super(message);
		this.name = this.constructor.name;
		this.code = code;
		this.suggestion = suggestion;
		this.context = context;
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

export class DependencyResolutionError extends BunstoneError {
	constructor(message: string, suggestion?: string, context?: any) {
		super(message, "BNS-DI-001", suggestion, context);
	}
}

export class ModuleInitializationError extends BunstoneError {
	constructor(message: string, suggestion?: string, context?: any) {
		super(message, "BNS-MOD-001", suggestion, context);
	}
}

export class CqrsError extends BunstoneError {
	constructor(message: string, suggestion?: string, context?: any) {
		super(message, "BNS-CQRS-001", suggestion, context);
	}
}

export class DatabaseError extends BunstoneError {
	constructor(message: string, suggestion?: string, context?: any) {
		super(message, "BNS-DB-001", suggestion, context);
	}
}

export class ConfigurationError extends BunstoneError {
	constructor(message: string, suggestion?: string, context?: any) {
		super(message, "BNS-CFG-001", suggestion, context);
	}
}

export class GuardError extends BunstoneError {
	constructor(message: string, suggestion?: string, context?: any) {
		super(message, "BNS-GRD-001", suggestion, context);
	}
}

export class AdapterError extends BunstoneError {
	constructor(message: string, suggestion?: string, context?: any) {
		super(message, "BNS-ADP-001", suggestion, context);
	}
}
