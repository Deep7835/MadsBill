import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const sfProRounded = localFont({
  src: [
    {
      path: "../../node_modules/@fontpkg/sf-pro-rounded/SF-Pro-Rounded-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontpkg/sf-pro-rounded/SF-Pro-Rounded-Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontpkg/sf-pro-rounded/SF-Pro-Rounded-Semibold.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../node_modules/@fontpkg/sf-pro-rounded/SF-Pro-Rounded-Bold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-sf-pro-rounded",
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
    <html lang="en" className={`${sfProRounded.variable} h-full`}>
      <body className="min-h-full bg-background font-sans text-foreground antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
