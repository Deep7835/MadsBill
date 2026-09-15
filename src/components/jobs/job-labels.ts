import type { JobEntry } from "@/lib/types/database";

/** The two figures the sheet reports but the table does not store. */
export const jobBalance = (job: JobEntry) => Number(job.total_sale) - Number(job.advance_paid);
export const jobProfit = (job: JobEntry) => Number(job.total_sale) - Number(job.direct_cost);
