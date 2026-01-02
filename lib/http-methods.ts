/**
 * Creates a method decorator for HTTP methods.
 * @param httpMethod The HTTP method (e.g., 'GET', 'POST').
 * @param pathname The path for the method.
 * @returns A method decorator.
 */
function HttpMethodDecorator(
  httpMethod: string,
  pathname: string = ""
): MethodDecorator {
  if (!pathname.startsWith("/")) {
    pathname = `/${pathname}`;
  }

  return function (target, propertyKey, descriptor) {
    Reflect.defineMetadata(
      "dip:http-method",
      `${httpMethod} ${pathname}`,
      descriptor.value as Function
    );
  };
}

/**
 * Decorator for GET HTTP method.
 * @param pathname The path for the method.
 * @returns A method decorator.
 */
export function GET(pathname: string = ""): MethodDecorator {
  return HttpMethodDecorator("GET", pathname);
}

/**
 * Decorator for POST HTTP method.
 * @param pathname The path for the method.
 * @returns A method decorator.
 */
export function POST(pathname: string = ""): MethodDecorator {
  return HttpMethodDecorator("POST", pathname);
}

export function PUT(pathname: string = ""): MethodDecorator {
  return HttpMethodDecorator("PUT", pathname);
}

export function DELETE(pathname: string = ""): MethodDecorator {
  return HttpMethodDecorator("DELETE", pathname);
}

export function PATCH(pathname: string = ""): MethodDecorator {
  return HttpMethodDecorator("PATCH", pathname);
}

export function OPTIONS(pathname: string = ""): MethodDecorator {
  return HttpMethodDecorator("OPTIONS", pathname);
}

export function HEAD(pathname: string = ""): MethodDecorator {
  return HttpMethodDecorator("HEAD", pathname);
}
