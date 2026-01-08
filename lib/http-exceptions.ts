/**
 * Base class for all HTTP exceptions.
 */
export class HttpException extends Error {
  constructor(
    public readonly response: string | object,
    public readonly status: number,
  ) {
    super(typeof response === "string" ? response : JSON.stringify(response));
    Object.setPrototypeOf(this, HttpException.prototype);
  }

  getResponse() {
    return this.response;
  }

  getStatus() {
    return this.status;
  }
}

/**
 * 400 Bad Request Exception
 */
export class BadRequestException extends HttpException {
  constructor(response: string | object = "Bad Request") {
    super(response, 400);
  }
}

/**
 * 401 Unauthorized Exception
 */
export class UnauthorizedException extends HttpException {
  constructor(response: string | object = "Unauthorized") {
    super(response, 401);
  }
}

/**
 * 403 Forbidden Exception
 */
export class ForbiddenException extends HttpException {
  constructor(response: string | object = "Forbidden") {
    super(response, 403);
  }
}

/**
 * 404 Not Found Exception
 */
export class NotFoundException extends HttpException {
  constructor(response: string | object = "Not Found") {
    super(response, 404);
  }
}

/**
 * 409 Conflict Exception
 */
export class ConflictException extends HttpException {
  constructor(response: string | object = "Conflict") {
    super(response, 409);
  }
}

/**
 * 422 Unprocessable Entity Exception
 */
export class UnprocessableEntityException extends HttpException {
  constructor(response: string | object = "Unprocessable Entity") {
    super(response, 422);
  }
}

/**
 * 500 Internal Server Error Exception
 */
export class InternalServerErrorException extends HttpException {
  constructor(response: string | object = "Internal Server Error") {
    super(response, 500);
  }
}

/**
 * Success "Exceptions" (can be thrown to exit early with a specific status)
 */

/**
 * 200 OK
 */
export class OkResponse extends HttpException {
  constructor(response: string | object = "OK") {
    super(response, 200);
  }
}

/**
 * 201 Created
 */
export class CreatedResponse extends HttpException {
  constructor(response: string | object = "Created") {
    super(response, 201);
  }
}

/**
 * 204 No Content
 */
export class NoContentResponse extends HttpException {
  constructor() {
    super("", 204);
  }
}
