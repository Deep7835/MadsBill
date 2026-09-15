import type { Metadata } from "next";
import { JobSheetView } from "@/components/jobs/job-sheet-view";

export const metadata: Metadata = { title: "Daily Job Sheet" };

export default function JobsPage() {
  return <JobSheetView />;
}
