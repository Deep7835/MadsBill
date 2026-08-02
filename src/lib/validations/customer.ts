import { z } from "zod";

/** Optional text: blank in the form becomes NULL in Postgres. */
const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max, "Too long")
    .optional()
    .transform((v) => (v ? v : null));

const optionalPattern = (regex: RegExp, message: string, max = 60) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .refine((v) => !v || regex.test(v), { message })
    .transform((v) => (v ? v : null));

export const customerSchema = z.object({
  business_name: z.string().trim().min(2, "Business name is required").max(150),
  contact_person: optionalText(),
  mobile: optionalPattern(/^[0-9+\-\s()]{7,20}$/, "Enter a valid mobile number", 20),
  email: optionalPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email", 120),
  gst_number: optionalPattern(/^[0-9A-Z]{15}$/, "GSTIN must be 15 characters (A-Z, 0-9)", 15),
  address: optionalText(400),
  city: optionalText(80),
  state: optionalText(80),
});

/** What the form holds (strings) vs. what Postgres receives (nulls allowed). */
export type CustomerFormValues = z.input<typeof customerSchema>;
export type CustomerPayload = z.output<typeof customerSchema>;
