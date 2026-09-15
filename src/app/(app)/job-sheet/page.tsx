import { redirect } from "next/navigation";

/** The job sheet moved to /jobs; keep old bookmarks working. */
export default function JobSheetRedirect() {
  redirect("/jobs");
}
