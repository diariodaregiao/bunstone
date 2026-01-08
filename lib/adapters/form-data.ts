import { PARAM_METADATA_KEY } from "../constants";
import { ParamType, type FormDataOptions } from "../http-params";
import "reflect-metadata";
export { type FormDataPayload, type FormDataFields } from "../http-params";

export function FormData(options: FormDataOptions = {}): ParameterDecorator {
  return function (
    target: any,
    propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) {
    const existingParams =
      (propertyKey === undefined
        ? Reflect.getOwnMetadata(PARAM_METADATA_KEY, target)
        : Reflect.getOwnMetadata(PARAM_METADATA_KEY, target, propertyKey)) ||
      [];

    existingParams.push({
      index: parameterIndex,
      type: ParamType.FORM_DATA,
      options,
    });

    if (propertyKey === undefined) {
      Reflect.defineMetadata(PARAM_METADATA_KEY, existingParams, target);
    } else {
      Reflect.defineMetadata(
        PARAM_METADATA_KEY,
        existingParams,
        target,
        propertyKey,
      );
    }
  };
}
