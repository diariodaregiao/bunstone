import "reflect-metadata";

/**
 * Creates a method decorator for HTTP methods.
 * @param httpMethod The HTTP method (e.g., 'GET', 'POST').
 * @param pathname The path for the method.
 * @returns A method decorator.
 */
function HttpMethodDecorator(httpMethod: string, pathname: string = ""): any {
  if (!pathname.startsWith("/")) {
    pathname = `/${pathname}`;
  }

  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    Reflect.defineMetadata(
      "dip:http-method",
      `${httpMethod} ${pathname}`,
      descriptor.value as Function,
    );
    return descriptor;
  };
}

/**
 * Route decorator for GET requests.
 * @param pathname Optional path for the route.
 */
export function Get(pathname: string = ""): any {
  return HttpMethodDecorator("GET", pathname);
}

/**
 * Route decorator for POST requests.
 * @param pathname Optional path for the route.
 */
export function Post(pathname: string = ""): any {
  return HttpMethodDecorator("POST", pathname);
}

/**
 * Route decorator for PUT requests.
 * @param pathname Optional path for the route.
 */
export function Put(pathname: string = ""): any {
  return HttpMethodDecorator("PUT", pathname);
}

/**
 * Route decorator for DELETE requests.
 * @param pathname Optional path for the route.
 */
export function Delete(pathname: string = ""): any {
  return HttpMethodDecorator("DELETE", pathname);
}

/**
 * Route decorator for PATCH requests.
 * @param pathname Optional path for the route.
 */
export function Patch(pathname: string = ""): any {
  return HttpMethodDecorator("PATCH", pathname);
}

/**
 * Route decorator for OPTIONS requests.
 * @param pathname Optional path for the route.
 */
export function Options(pathname: string = ""): any {
  return HttpMethodDecorator("OPTIONS", pathname);
}

/**
 * Route decorator for HEAD requests.
 * @param pathname Optional path for the route.
 */
export function Head(pathname: string = ""): any {
  return HttpMethodDecorator("HEAD", pathname);
}
