import type { Metadata } from "next";
import { GstBillsView } from "@/components/gst-bills/gst-bills-view";

export const metadata: Metadata = { title: "GST Bills" };

export default function GstBillsPage() {
  return <GstBillsView />;
}
