import { z } from "zod";
import { numericField, optionalNumericField } from "@/lib/validations/numeric";

export const quotationItemSchema = z
  .object({
    id: z.string().optional(),
    product_id: z.string().uuid().nullable().optional(),
    description: z.string().trim().min(1, "Description is required").max(300),
    rate_type: z.enum(["sqft", "piece"]),
    width: optionalNumericField("Width", { max: 100_000 }),
    height: optionalNumericField("Height", { max: 100_000 }),
    qty: numericField("quantity", { min: 0.01, max: 1_000_000 }),
    rate: numericField("rate", { max: 9_999_999 }),
    gst_percent: numericField("GST %", { max: 100 }),
  })
  .superRefine((item, ctx) => {
    if (item.rate <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["rate"],
        message: "Rate must be greater than 0",
      });
    }

    if (item.rate_type !== "sqft") return;
    if (!item.width || item.width <= 0) {
      ctx.addIssue({ code: "custom", path: ["width"], message: "Width is required" });
    }
    if (!item.height || item.height <= 0) {
      ctx.addIssue({ code: "custom", path: ["height"], message: "Height is required" });
    }
  });

export const quotationSchema = z.object({
  customer_id: z.string().uuid({ message: "Select a customer" }),
  date: z.string().min(1, "Date is required"),
  valid_until: z
    .string()
    .optional()
    .transform((v) => (v ? v : null)),
  status: z.enum(["quotation", "invoice"]),
  payment_status: z.enum(["unpaid", "partial", "paid"]),
  notes: z
    .string()
    .trim()
    .max(1000, "Too long")
    .optional()
    .transform((v) => (v ? v : null)),
  items: z.array(quotationItemSchema).min(1, "Add at least one line item"),
});

export type QuotationItemFormValues = z.input<typeof quotationItemSchema>;
export type QuotationItemPayload = z.output<typeof quotationItemSchema>;
export type QuotationFormValues = z.input<typeof quotationSchema>;
export type QuotationPayload = z.output<typeof quotationSchema>;
