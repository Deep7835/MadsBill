import { z } from "zod";

const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max, "Too long")
    .optional()
    .transform((v) => (v ? v : null));

const optionalPattern = (regex: RegExp, message: string, max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .refine((v) => !v || regex.test(v), { message })
    .transform((v) => (v ? v : null));

export const settingsSchema = z.object({
  company_name: z.string().trim().min(2, "Company name is required").max(150),
  logo_url: optionalPattern(/^https?:\/\/\S+$/i, "Enter a valid image URL", 500),
  gst_number: optionalPattern(/^[0-9A-Z]{15}$/, "GSTIN must be 15 characters (A-Z, 0-9)", 15),
  address: optionalText(400),
  city: optionalText(80),
  state: optionalText(80),
  phone: optionalText(40),
  email: optionalPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email", 120),
  website: optionalText(120),
  bank_details: optionalText(600),
  terms: optionalText(2000),
});

export type SettingsFormValues = z.input<typeof settingsSchema>;
export type SettingsPayload = z.output<typeof settingsSchema>;
