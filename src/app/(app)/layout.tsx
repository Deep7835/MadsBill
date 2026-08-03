import { redirect } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { SetupNotice } from "@/components/shared/setup-notice";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) return <SetupNotice />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: settings }, { data: profile }] = await Promise.all([
    supabase.from("settings").select("company_name").eq("id", 1).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);

  const companyName = settings?.company_name ?? "Madskraft Flex & Advertising";
  const userName = profile?.full_name ?? user.email?.split("@")[0] ?? "User";

  return (
    <div className="app-shell flex min-h-dvh gap-3 px-2 sm:px-3 lg:px-3.5">
      <Sidebar companyName={companyName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar companyName={companyName} userEmail={user.email ?? ""} userName={userName} />
        <main className="flex-1 pb-8">
          <div className="w-full space-y-5">{children}</div>
        </main>
      </div>
    </div>
  );
}
