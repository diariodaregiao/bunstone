import "reflect-metadata";

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
 * Route decorator for GET requests.
 * @param pathname Optional path for the route.
 */
export function Get(pathname: string = ""): MethodDecorator {
  return HttpMethodDecorator("GET", pathname);
}

/**
 * Route decorator for POST requests.
 * @param pathname Optional path for the route.
 */
export function Post(pathname: string = ""): MethodDecorator {
  return HttpMethodDecorator("POST", pathname);
}

/**
 * Route decorator for PUT requests.
 * @param pathname Optional path for the route.
 */
export function Put(pathname: string = ""): MethodDecorator {
  return HttpMethodDecorator("PUT", pathname);
}

/**
 * Route decorator for DELETE requests.
 * @param pathname Optional path for the route.
 */
export function Delete(pathname: string = ""): MethodDecorator {
  return HttpMethodDecorator("DELETE", pathname);
}

/**
 * Route decorator for PATCH requests.
 * @param pathname Optional path for the route.
 */
export function Patch(pathname: string = ""): MethodDecorator {
  return HttpMethodDecorator("PATCH", pathname);
}

/**
 * Route decorator for OPTIONS requests.
 * @param pathname Optional path for the route.
 */
export function Options(pathname: string = ""): MethodDecorator {
  return HttpMethodDecorator("OPTIONS", pathname);
}

/**
 * Route decorator for HEAD requests.
 * @param pathname Optional path for the route.
 */
export function Head(pathname: string = ""): MethodDecorator {
  return HttpMethodDecorator("HEAD", pathname);
}
