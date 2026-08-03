import type { Metadata } from "next";
import {
  Analytics01Icon,
  ChartHistogramIcon,
  DocumentValidationIcon,
  FileExportIcon,
  Invoice01Icon,
  Legal01Icon,
  PieChartIcon,
  UserGroupIcon,
  Calendar03Icon,
} from "@hugeicons/core-free-icons";

import { ModulePreview } from "@/components/management/module-preview";

export const metadata: Metadata = { title: "Reports & GST" };

export default function ReportsPage() {
  return (
    <ModulePreview
      title="Reports & GST"
      description="Sales summaries, customer analytics and return-ready GST statements built from the invoices you already raise."
      icon={Analytics01Icon}
      accent="emerald"
      headline="Filing season without the spreadsheet scramble"
      summary="Every invoice already carries GSTIN, place of supply and tax split. Reports will roll that into the summaries your accountant asks for, exportable in the formats the GST portal accepts."
      features={[
        {
          icon: DocumentValidationIcon,
          title: "GSTR-1 summary",
          description: "Outward supplies grouped B2B and B2C, with taxable value and tax split per rate slab.",
        },
        {
          icon: Legal01Icon,
          title: "GSTR-3B figures",
          description: "Output tax against input credit for the period, ready to key into the portal.",
        },
        {
          icon: ChartHistogramIcon,
          title: "Sales register",
          description: "Every invoice for a date range with GSTIN, taxable value, CGST, SGST and IGST in one table.",
        },
        {
          icon: PieChartIcon,
          title: "Product performance",
          description: "Which materials and sizes actually earn — by revenue, volume and average rate.",
        },
        {
          icon: UserGroupIcon,
          title: "Customer analytics",
          description: "Top customers, repeat rate and outstanding balance, so follow-ups go where they matter.",
        },
        {
          icon: FileExportIcon,
          title: "Excel & PDF export",
          description: "Download any report as a spreadsheet for your CA or a PDF for your own records.",
        },
      ]}
      shortcuts={[
        {
          href: "/quotations",
          label: "Quotations & Invoices",
          description: "Filter by status and date to check a period",
          icon: Invoice01Icon,
        },
        {
          href: "/dashboard",
          label: "Dashboard",
          description: "Monthly sales and pending collection at a glance",
          icon: Calendar03Icon,
        },
      ]}
    />
  );
}
