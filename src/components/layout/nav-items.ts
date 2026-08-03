import {
  DashboardSquare01Icon,
  CalculatorIcon,
  Invoice01Icon,
  UserGroupIcon,
  PackageIcon,
  BoxIcon,
  ReceiptTextIcon,
  Analytics01Icon,
  Settings02Icon,
} from "@hugeicons/core-free-icons";
import type { IconElement } from "@/components/ui/icon";

export interface NavItem {
  href: string;
  label: string;
  icon: IconElement;
  badge?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardSquare01Icon },
  { href: "/calculator", label: "Price Calculator", icon: CalculatorIcon },
  { href: "/quotations", label: "Quotations & Bills", icon: Invoice01Icon },
  { href: "/customers", label: "Customers Ledger", icon: UserGroupIcon },
  { href: "/products", label: "Products & Rates", icon: PackageIcon },
  { href: "/inventory", label: "Inventory (Soon)", icon: BoxIcon, badge: "Soon" },
  { href: "/expenses", label: "Expenses (Soon)", icon: ReceiptTextIcon, badge: "Soon" },
  { href: "/reports", label: "Reports & GST", icon: Analytics01Icon, badge: "Soon" },
  { href: "/settings", label: "Settings & Stamp", icon: Settings02Icon },
];
