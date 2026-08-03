import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon } from "@hugeicons/core-free-icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Shown when the Supabase env vars are missing, instead of a network error. */
export function SetupNotice() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <span className="flex size-10 items-center justify-center rounded-lg bg-[var(--warning)]/15 text-[var(--warning)]">
            <HugeiconsIcon icon={Alert01Icon} className="size-5" />
          </span>
          <CardTitle className="mt-2">Connect Supabase to continue</CardTitle>
          <CardDescription>
            The app needs your Supabase project credentials before it can sign anyone in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>
              Create a project at <span className="font-medium text-foreground">supabase.com</span>.
            </li>
            <li>
              Run the migration in{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                supabase/migrations/
              </code>{" "}
              then{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">supabase/seed.sql</code>{" "}
              in the SQL editor.
            </li>
            <li>
              Copy <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">.env.example</code>{" "}
              to <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">.env.local</code> and
              fill in the Project URL and anon key.
            </li>
            <li>Restart the dev server.</li>
          </ol>

          <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...`}
          </pre>
        </CardContent>
      </Card>
    </main>
  );
}
