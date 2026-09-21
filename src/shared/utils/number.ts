import { z } from "@hono/zod-openapi";

export const emptyToUndefined = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;

  const stringValue = String(value).trim();

  return stringValue === "" ? undefined : stringValue;
};

export const removeThousandSeparator = (value: unknown): string | undefined => {
  const stringValue = emptyToUndefined(value);

  if (!stringValue) return undefined;

  return stringValue.replace(/,/g, "");
};

export const toNumberOrUndefined = (value: unknown): number | undefined => {
  const stringValue = emptyToUndefined(value);

  if (!stringValue) return undefined;

  const numberValue = Number(stringValue);

  return Number.isFinite(numberValue) ? numberValue : undefined;
};

export const currencyToNumberOrUndefined = (value: unknown): number | undefined => {
  return toNumberOrUndefined(removeThousandSeparator(value));
};

export const coercedNumber = (defaultValue: number) =>
  z
    .preprocess(
      (val: string | null) => (val === "" || val === null ? undefined : val),
      z.coerce.number().int().positive(),
    )
    .default(defaultValue);
