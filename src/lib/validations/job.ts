import { z } from "zod";
import { numericField } from "@/lib/validations/numeric";

const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max, "Too long")
    .optional()
    .transform((v) => (v ? v : null));

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v ? v : null));

export const JOB_STATUSES = ["Pending", "In Production", "Ready", "Completed", "Delivered", "Cancelled"] as const;
export const JOB_CUSTOMER_TYPES = ["New", "Repeat"] as const;
export const JOB_PAYMENT_MODES = ["UPI", "Cash", "Card", "Bank Transfer", "Credit"] as const;

export const jobEntrySchema = z
  .object({
    date: z.string().min(1, "Date is required"),
    customer_name: z.string().trim().min(2, "Customer name is required").max(150),
    mobile: z
      .string()
      .trim()
      .max(20)
      .optional()
      .refine((v) => !v || /^[0-9+\-\s()]{7,20}$/.test(v), { message: "Enter a valid mobile number" })
      .transform((v) => (v ? v : null)),
    product_name: z.string().trim().min(1, "Product is required").max(200),
    size: optionalText(80),
    qty: numericField("quantity", { min: 0.01, max: 1_000_000 }),
    total_sale: numericField("total sale", { max: 99_999_999 }),
    advance_paid: numericField("advance", { max: 99_999_999 }),
    status: z.enum(JOB_STATUSES),
    customer_type: z.enum(JOB_CUSTOMER_TYPES),
    primary_staff: optionalText(80),
    payment_mode: z.enum(JOB_PAYMENT_MODES),
    delivery_date: optionalDate,
    actual_delivery_date: optionalDate,
    direct_cost: numericField("direct cost", { max: 99_999_999 }),
  })
  .refine((job) => job.advance_paid <= job.total_sale, {
    path: ["advance_paid"],
    message: "Advance cannot exceed the total sale",
  });

export type JobEntryFormValues = z.input<typeof jobEntrySchema>;
export type JobEntryPayload = z.output<typeof jobEntrySchema>;
