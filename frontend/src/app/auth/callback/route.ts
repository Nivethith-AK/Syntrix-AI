import { NextResponse } from "next/server";

import { safeNextPath } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

function profileFromMetadata(meta: Record<string, unknown> | undefined) {
  const fullName = typeof meta?.full_name === "string" ? meta.full_name.trim() : "";
  const name = typeof meta?.name === "string" ? meta.name.trim() : "";
  const given = typeof meta?.given_name === "string" ? meta.given_name.trim() : "";
  const family = typeof meta?.family_name === "string" ? meta.family_name.trim() : "";
  const composed = `${given} ${family}`.trim();
  const displayName = fullName || name || composed || null;
  const avatar =
    (typeof meta?.avatar_url === "string" && meta.avatar_url.trim()) ||
    (typeof meta?.picture === "string" && meta.picture.trim()) ||
    null;
  return { displayName, avatar };
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"), "/app");
  const verified = searchParams.get("verified");
  const errorDescription = searchParams.get("error_description") || searchParams.get("error");

  if (errorDescription) {
    const lower = errorDescription.toLowerCase();
    const kind =
      lower.includes("provider") || lower.includes("oauth")
        ? "oauth_provider"
        : "auth_callback";
    return NextResponse.redirect(`${origin}/sign-in?error=${kind}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Sync Google/OAuth name + avatar into public.users (fill blanks only).
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { displayName, avatar } = profileFromMetadata(
          user.user_metadata as Record<string, unknown> | undefined,
        );
        const { data: existing } = await supabase
          .from("users")
          .select("display_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        const patch: {
          email?: string;
          display_name?: string;
          avatar_url?: string;
        } = {};
        if (user.email) patch.email = user.email;
        if (displayName && !existing?.display_name) patch.display_name = displayName;
        if (avatar && !existing?.avatar_url) patch.avatar_url = avatar;

        if (Object.keys(patch).length > 0) {
          await supabase.from("users").update(patch).eq("id", user.id);
        }
      }

      if (next.startsWith("/update-password")) {
        return NextResponse.redirect(`${origin}/update-password`);
      }
      if (verified === "1") {
        return NextResponse.redirect(`${origin}/app?verified=1`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth_callback`);
}
