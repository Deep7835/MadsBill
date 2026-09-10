import { JobSheetView } from "@/components/job-sheet/job-sheet-view";

export const metadata = {
  title: "Daily Job Sheet | MadsBill",
  description: "Record daily print production, sales, advance payments, direct costs, and gross profit.",
};

export default function JobSheetPage() {
  return <JobSheetView />;
}
