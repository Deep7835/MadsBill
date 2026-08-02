import { z } from "zod";
import { numericField } from "@/lib/validations/numeric";

export const productSchema = z.object({
  name: z.string().trim().min(2, "Product name is required").max(120),
  category: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) => (v ? v : null)),
  rate_type: z.enum(["sqft", "piece"], { message: "Select a rate type" }),
  unit: z.string().trim().min(1, "Unit is required").max(20),
  default_rate: numericField("rate", { max: 9_999_999 }),
  gst_percent: numericField("GST %", { max: 100 }),
  is_active: z.boolean(),
});

export type ProductFormValues = z.input<typeof productSchema>;
export type ProductPayload = z.output<typeof productSchema>;
