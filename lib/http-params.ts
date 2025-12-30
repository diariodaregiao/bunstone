import { PARAM_METADATA_KEY } from "./constants";

enum ParamType {
  BODY = "body",
  QUERY = "query",
  PARAM = "param",
  HEADER = "header",
  REQUEST = "request",
}

function setParamMetadata(
  target: any,
  propertyKey: string | symbol,
  parameterIndex: number,
  type: ParamType,
  key?: string
) {
  const existingParams =
    Reflect.getOwnMetadata(PARAM_METADATA_KEY, target, propertyKey) || [];

  existingParams.push({ index: parameterIndex, type, key });

  Reflect.defineMetadata(
    PARAM_METADATA_KEY,
    existingParams,
    target,
    propertyKey
  );
}

export function BODY(): ParameterDecorator {
  return function (target, propertyKey, parameterIndex) {
    setParamMetadata(
      target,
      propertyKey as string,
      parameterIndex,
      ParamType.BODY
    );
  };
}

export function PARAM(key?: string): ParameterDecorator {
  return function (target, propertyKey, parameterIndex) {
    setParamMetadata(
      target,
      propertyKey as string,
      parameterIndex,
      ParamType.PARAM,
      key
    );
  };
}

export function QUERY(key?: string): ParameterDecorator {
  return function (target, propertyKey, parameterIndex) {
    setParamMetadata(
      target,
      propertyKey as string,
      parameterIndex,
      ParamType.QUERY,
      key
    );
  };
}

export function HEADER(key: string) {
  return function (
    target: any,
    propertyKey: string | symbol,
    parameterIndex: number
  ) {
    setParamMetadata(
      target,
      propertyKey,
      parameterIndex,
      ParamType.HEADER,
      key
    );
  };
}

export function REQUEST() {
  return function (
    target: any,
    propertyKey: string | symbol,
    parameterIndex: number
  ) {
    setParamMetadata(target, propertyKey, parameterIndex, ParamType.REQUEST);
  };
}

export function processParameters(
  request: any,
  target: any,
  propertyKey: string
): any[] {
  const paramMetadata =
    Reflect.getOwnMetadata(
      PARAM_METADATA_KEY,
      Object.getPrototypeOf(target),
      propertyKey
    ) || [];

  const paramTypes =
    Reflect.getMetadata("design:paramtypes", target, propertyKey) || [];

  const args: any[] = new Array(paramTypes.length);

  for (const metadata of paramMetadata) {
    const { index, type, key } = metadata;

    switch (type) {
      case ParamType.BODY:
        try {
          args[index] = request.body;
        } catch (e) {
          args[index] = null;
        }
        break;

      case ParamType.QUERY:
        const url = new URL(request.url);
        if (key) {
          args[index] = url.searchParams.get(key);
        } else {
          args[index] = Object.fromEntries(url.searchParams.entries());
        }
        break;

      case ParamType.PARAM:
        if (key === undefined) {
          args[index] = request.params;
        } else {
          args[index] = request.params?.[key!];
        }
        break;

      case ParamType.HEADER:
        args[index] = request.headers.get(key!);
        break;

      case ParamType.REQUEST:
        args[index] = request;
        break;
    }
  }

  return args;
}
