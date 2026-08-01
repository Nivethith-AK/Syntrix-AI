import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getPublicEnv } from "@/lib/env";

/** Visiting the site always goes to sign-in (or dashboard if already logged in). */
export default async function HomePage() {
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
  if (!supabaseUrl || !supabaseAnonKey) {
    redirect("/sign-in");
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    redirect(user ? "/app" : "/sign-in");
  } catch {
    redirect("/sign-in");
  }
}
