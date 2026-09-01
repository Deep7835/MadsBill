import { z } from "zod";
import { numericField, optionalNumericField } from "@/lib/validations/numeric";

export const productSchema = z
  .object({
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
    hsn_code: z
      .string()
      .trim()
      .max(10)
      .optional()
      .transform((v) => (v ? v : null)),
    is_active: z.boolean(),
    // Volume pricing — only meaningful for per-sq.ft. products.
    slab1_min_area: optionalNumericField("Slab 1 area", { max: 1_000_000 }),
    slab1_discount: numericField("Slab 1 discount", { max: 9_999_999 }),
    slab2_min_area: optionalNumericField("Slab 2 area", { max: 1_000_000 }),
    slab2_discount: numericField("Slab 2 discount", { max: 9_999_999 }),
  })
  .superRefine((product, ctx) => {
    if (product.rate_type !== "sqft") return;

    if (product.slab1_discount >= product.default_rate && product.slab1_min_area) {
      ctx.addIssue({
        code: "custom",
        path: ["slab1_discount"],
        message: "Discount must be less than the rate",
      });
    }
    if (product.slab2_discount >= product.default_rate && product.slab2_min_area) {
      ctx.addIssue({
        code: "custom",
        path: ["slab2_discount"],
        message: "Discount must be less than the rate",
      });
    }
    if (
      product.slab1_min_area &&
      product.slab2_min_area &&
      product.slab2_min_area <= product.slab1_min_area
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["slab2_min_area"],
        message: "Must be larger than the slab 1 area",
      });
    }
  });

export type ProductFormValues = z.input<typeof productSchema>;
export type ProductPayload = z.output<typeof productSchema>;
