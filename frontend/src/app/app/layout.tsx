import { Suspense } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell";
import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

function ShellFallback() {
  return (
    <div className="sales-ops-theme flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      Loading dashboard…
    </div>
  );
}

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
  if (!supabaseUrl || !supabaseAnonKey) {
    redirect("/sign-in?error=missing_env");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/app");
  }

  return (
    <Suspense fallback={<ShellFallback />}>
      <AppShell email={user.email}>{children}</AppShell>
    </Suspense>
  );
}
