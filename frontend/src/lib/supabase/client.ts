import { createBrowserClient } from "@supabase/ssr";

import { assertClientEnv } from "@/lib/env";

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = assertClientEnv();
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
