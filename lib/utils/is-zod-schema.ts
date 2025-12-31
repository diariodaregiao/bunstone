import type { ZodType } from "zod/v4";

export const isZodSchema = (obj: any): obj is ZodType => {
  return obj && typeof obj === "object" && typeof obj.parse === "function";
};
