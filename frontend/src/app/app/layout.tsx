import { Suspense } from "react";

import { AppShell } from "@/components/shell/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Suspense
      fallback={
        <div className="syntrix-theme flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
          Loading workspace…
        </div>
      }
    >
      <AppShell email={user?.email}>{children}</AppShell>
    </Suspense>
  );
}
