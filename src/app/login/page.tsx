import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { SetupNotice } from "@/components/shared/setup-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  if (!isSupabaseConfigured) return <SetupNotice />;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-sm">
        <Suspense fallback={<Skeleton className="h-[420px] w-full rounded-xl" />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
