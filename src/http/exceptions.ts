export class HttpException extends Error {
	readonly response: object;

	constructor(
		response: string | object,
		readonly status: number,
	) {
		const responseObj =
			typeof response === "string" ? { message: response } : response;
		const message =
			typeof response === "string"
				? response
				: ((response as { message?: string }).message ??
					JSON.stringify(response));
		super(message);
		this.response = responseObj;
		Object.setPrototypeOf(this, new.target.prototype);
	}

	getResponse(): object {
		return this.response;
	}

	getStatus(): number {
		return this.status;
	}
}

export class BadRequestException extends HttpException {
	constructor(response: string | object = "Bad Request") {
		super(response, 400);
	}
}

export class UnauthorizedException extends HttpException {
	constructor(response: string | object = "Unauthorized") {
		super(response, 401);
	}
}

export class ForbiddenException extends HttpException {
	constructor(response: string | object = "Forbidden") {
		super(response, 403);
	}
}

export class NotFoundException extends HttpException {
	constructor(response: string | object = "Not Found") {
		super(response, 404);
	}
}

export class ConflictException extends HttpException {
	constructor(response: string | object = "Conflict") {
		super(response, 409);
	}
}

export class UnprocessableEntityException extends HttpException {
	constructor(response: string | object = "Unprocessable Entity") {
		super(response, 422);
	}
}

export class TooManyRequestsException extends HttpException {
	constructor(response: string | object = "Too Many Requests") {
		super(response, 429);
	}
}

export class InternalServerErrorException extends HttpException {
	constructor(response: string | object = "Internal Server Error") {
		super(response, 500);
	}
}
