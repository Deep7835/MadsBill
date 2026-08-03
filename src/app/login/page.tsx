import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { BrandLogo } from "@/components/shared/brand-logo";
import { SetupNotice } from "@/components/shared/setup-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Sign in" };

/** Hand-drawn style backdrop, echoing the sheets and signage the shop prints. */
function LoginDecor() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden opacity-80 lg:block dark:opacity-25">
      <svg
        viewBox="0 0 260 220"
        fill="none"
        className="absolute bottom-16 left-10 w-64 xl:w-72"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="login-dots-left" width="11" height="11" patternUnits="userSpaceOnUse">
            <circle cx="2.5" cy="2.5" r="1.7" fill="#312e81" />
          </pattern>
        </defs>
        <rect x="8" y="70" width="72" height="140" rx="4" fill="url(#login-dots-left)" opacity="0.55" />
        <rect x="98" y="112" width="92" height="98" rx="4" stroke="#cbd5e1" strokeWidth="2" />
        <path
          d="M116 146h56M116 164h38"
          stroke="#cbd5e1"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M6 34q12-18 24 0t24 0 24 0"
          stroke="#a5b4fc"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="196" cy="60" r="4" stroke="#cbd5e1" strokeWidth="2" />
      </svg>

      <svg
        viewBox="0 0 260 220"
        fill="none"
        className="absolute bottom-16 right-10 w-64 xl:w-72"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="login-dots-right" width="11" height="11" patternUnits="userSpaceOnUse">
            <circle cx="2.5" cy="2.5" r="1.7" fill="#312e81" />
          </pattern>
        </defs>
        <rect x="176" y="94" width="72" height="116" rx="4" fill="url(#login-dots-right)" opacity="0.55" />
        <rect x="60" y="52" width="92" height="66" rx="4" stroke="#cbd5e1" strokeWidth="2" />
        <path d="M78 80h56M78 96h38" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M52 200q34-6 52-34t34-44"
          stroke="#a5b4fc"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path d="M130 116l8 6 8-10" stroke="#a5b4fc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M186 26q10-14 20 0t20 0" stroke="#a5b4fc" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export default function LoginPage() {
  if (!isSupabaseConfigured) return <SetupNotice />;

  return (
    <main className="app-shell relative flex min-h-dvh flex-col overflow-hidden px-5 py-6 sm:px-10 sm:py-8">
      <LoginDecor />

      <header className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <BrandLogo className="h-10 sm:h-12" />
          <a
            href="mailto:sales@madskrafting.com"
            className="mt-2 inline-flex items-center gap-1.5 border-t border-slate-300/70 pt-2 text-[11px] font-medium text-slate-500 transition-colors hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400 dark:hover:text-indigo-400"
          >
            sales@madskrafting.com <span aria-hidden>→</span>
          </a>
        </div>

        <a
          href="https://wa.me/919876543210"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-[5px] bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700"
        >
          Need access?
        </a>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-sm">
          <Suspense fallback={<Skeleton className="h-[420px] w-full rounded-[5px]" />}>
            <LoginForm />
          </Suspense>
        </div>
      </div>

      <footer className="relative z-10 text-center text-[11px] font-medium text-slate-400 dark:text-slate-500">
        © {new Date().getFullYear()} Madskraft Flex &amp; Advertising &nbsp;|&nbsp; Quotation &amp; Billing
      </footer>
    </main>
  );
}
