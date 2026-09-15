import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const uncutSans = localFont({
  src: "../../public/fonts/UncutSans-Variable.ttf",
  weight: "100 900",
  variable: "--font-uncut-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Madskraft — Quotation & Billing",
    template: "%s · Madskraft",
  },
  description: "Quotation and billing for Madskraft Flex & Advertising.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${uncutSans.variable} h-full`}>
      <body className="min-h-full bg-background font-sans text-foreground antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
