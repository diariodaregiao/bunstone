export function Jwt() {
  return function (
    target: any,
    propertyKey: string | symbol,
    parameterIndex: number
  ) {
    const existingRequiredParameters: number[] =
      Reflect.getOwnMetadata("dip:jwt:parameters", target, propertyKey) || [];
    existingRequiredParameters.push(parameterIndex);
    Reflect.defineMetadata(
      "dip:jwt:parameters",
      existingRequiredParameters,
      target,
      propertyKey
    );
  };
}
