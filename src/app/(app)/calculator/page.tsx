import type { Metadata } from "next";
import { PriceCalculatorView } from "@/components/calculator/price-calculator-view";

export const metadata: Metadata = { title: "Price calculator" };

export default function CalculatorPage() {
  return <PriceCalculatorView />;
}
