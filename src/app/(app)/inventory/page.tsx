import type { Metadata } from "next";
import {
  Alert02Icon,
  ArrowUpDownIcon,
  BoxesIcon,
  Calculator01Icon,
  DeliveryTruck01Icon,
  PackageIcon,
  Store01Icon,
  Tag01Icon,
} from "@hugeicons/core-free-icons";

import { ModulePreview } from "@/components/management/module-preview";

export const metadata: Metadata = { title: "Inventory" };

export default function InventoryPage() {
  return (
    <ModulePreview
      title="Inventory"
      description="Track flex rolls, vinyl, boards and hardware from purchase through to the job they were printed for."
      icon={BoxesIcon}
      accent="indigo"
      headline="Know exactly what material is left on the shelf"
      summary="Inventory will connect your stock to the jobs that consume it. Every invoice raised will draw down the material it used, so the running balance stays honest without a second spreadsheet."
      features={[
        {
          icon: PackageIcon,
          title: "Material stock register",
          description: "Opening stock, purchases and consumption per material, with roll width and length tracked in the same units you buy them.",
        },
        {
          icon: ArrowUpDownIcon,
          title: "Automatic consumption",
          description: "Square footage billed on an invoice is deducted from the matching roll, so stock moves as the work moves.",
        },
        {
          icon: Alert02Icon,
          title: "Low stock alerts",
          description: "Set a reorder level per material and get warned on the dashboard before a job stalls waiting for media.",
        },
        {
          icon: DeliveryTruck01Icon,
          title: "Purchase entries",
          description: "Log supplier bills with rate and quantity so material cost per square foot is always current.",
        },
        {
          icon: Calculator01Icon,
          title: "Wastage tracking",
          description: "Record offcuts and misprints against a job to see the true margin rather than the quoted one.",
        },
        {
          icon: Tag01Icon,
          title: "Batch and supplier notes",
          description: "Keep batch numbers and supplier details against each purchase for warranty and colour-matching claims.",
        },
      ]}
      shortcuts={[
        {
          href: "/products",
          label: "Products & Rates",
          description: "Maintain the material list and per-square-foot rates",
          icon: Store01Icon,
        },
        {
          href: "/calculator",
          label: "Price Calculator",
          description: "Work out area and cost before committing to a job",
          icon: Calculator01Icon,
        },
      ]}
    />
  );
}
