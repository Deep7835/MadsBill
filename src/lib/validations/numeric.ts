import { z } from "zod";

/**
 * HTML inputs hand back strings; Postgres wants numbers.
 * These helpers keep the *form* type concrete (`string | number`) — unlike
 * `z.coerce.number()`, whose input type is `unknown` and infects every
 * component that reads the field.
 */

const toNumber = (value: string | number): number => {
  if (typeof value === "number") return value;
  const trimmed = value.trim();
  return trimmed === "" ? Number.NaN : Number(trimmed);
};

export function numericField(label: string, { min = 0, max = 1e9 } = {}) {
  return z
    .union([z.number(), z.string()])
    .transform(toNumber)
    .refine((n) => Number.isFinite(n), { message: `Enter ${label}` })
    .refine((n) => n >= min, { message: `${label} must be at least ${min}` })
    .refine((n) => n <= max, { message: `${label} is too large` });
}

/** Blank stays blank: "" | null | undefined → null. */
export function optionalNumericField(label: string, { min = 0, max = 1e9 } = {}) {
  return z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((value): number | null => {
      if (value === null || value === undefined) return null;
      const n = toNumber(value);
      return Number.isFinite(n) ? n : null;
    })
    .refine((n) => n === null || n >= min, { message: `${label} must be at least ${min}` })
    .refine((n) => n === null || n <= max, { message: `${label} is too large` });
}
