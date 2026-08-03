import type { Metadata } from "next";
import {
  CalendarCheckIn01Icon,
  ChartUpIcon,
  CreditCardIcon,
  Invoice01Icon,
  MoneyBag02Icon,
  ReceiptTextIcon,
  RepeatIcon,
  Tag01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

import { ModulePreview } from "@/components/management/module-preview";

export const metadata: Metadata = { title: "Expenses" };

export default function ExpensesPage() {
  return (
    <ModulePreview
      title="Expenses"
      description="Record everything the business spends — material, rent, salaries, transport — and see what is actually left after a month of billing."
      icon={ReceiptTextIcon}
      accent="amber"
      headline="Turn revenue into real profit, not just turnover"
      summary="Expenses will sit alongside your invoices so the dashboard can show margin instead of sales. Recurring costs get entered once, and input GST on purchases is captured for the credit you are entitled to."
      features={[
        {
          icon: Tag01Icon,
          title: "Categorised spending",
          description: "Material, salary, rent, electricity, transport and miscellaneous, each with its own running total.",
        },
        {
          icon: RepeatIcon,
          title: "Recurring expenses",
          description: "Rent and salaries repeat every month automatically instead of being retyped each cycle.",
        },
        {
          icon: CreditCardIcon,
          title: "Payment mode tracking",
          description: "Cash, UPI, bank transfer or cheque against every entry, so the books reconcile with the account.",
        },
        {
          icon: Invoice01Icon,
          title: "Input GST capture",
          description: "Log GST paid on purchases and carry it into the return summary as input tax credit.",
        },
        {
          icon: ChartUpIcon,
          title: "Profit & loss view",
          description: "Sales minus expenses for any period, broken down by category so the leaks are obvious.",
        },
        {
          icon: CalendarCheckIn01Icon,
          title: "Month-on-month trend",
          description: "Compare this month against the last twelve to spot costs creeping up before they hurt.",
        },
      ]}
      shortcuts={[
        {
          href: "/quotations",
          label: "Quotations & Invoices",
          description: "The revenue side of the ledger, already live",
          icon: Invoice01Icon,
        },
        {
          href: "/customers",
          label: "Customers Ledger",
          description: "Outstanding payments and receipts by customer",
          icon: UserGroupIcon,
        },
        {
          href: "/dashboard",
          label: "Dashboard",
          description: "Today's sales, monthly total and pending amount",
          icon: MoneyBag02Icon,
        },
      ]}
    />
  );
}
