import {
  DashboardSquare01Icon,
  Calculator01Icon,
  Invoice01Icon,
  UserGroupIcon,
  PackageIcon,
  BoxesIcon,
  ReceiptTextIcon,
  Analytics01Icon,
  Settings01Icon,
  Task01Icon,
} from "@hugeicons/core-free-icons";

export interface NavItem {
  href: string;
  label: string;
  icon: any;
  badge?: string;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardSquare01Icon },
  { href: "/jobs", label: "Daily Job Sheet", icon: Task01Icon },
  { href: "/calculator", label: "Price Calculator", icon: Calculator01Icon },
  { href: "/quotations", label: "Quotations & Invoices", icon: Invoice01Icon },
  { href: "/customers", label: "Customers Ledger", icon: UserGroupIcon },
  { href: "/products", label: "Products & Rates", icon: PackageIcon },
];

export const MANAGEMENT_NAV_ITEMS: NavItem[] = [
  { href: "/inventory", label: "Inventory", icon: BoxesIcon, badge: "Soon" },
  { href: "/expenses", label: "Expenses", icon: ReceiptTextIcon, badge: "Soon" },
  { href: "/reports", label: "Reports & GST", icon: Analytics01Icon },
  { href: "/settings", label: "Company Settings", icon: Settings01Icon },
];

export const NAV_ITEMS: NavItem[] = [...MAIN_NAV_ITEMS, ...MANAGEMENT_NAV_ITEMS];
