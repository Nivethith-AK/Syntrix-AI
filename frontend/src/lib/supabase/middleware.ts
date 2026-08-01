import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicEnv } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();

  if (!supabaseUrl || !supabaseAnonKey) {
    // Still force visitors to sign-in when env is missing.
    if (request.nextUrl.pathname === "/" || request.nextUrl.pathname.startsWith("/app")) {
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute =
    path.startsWith("/sign-in") ||
    path.startsWith("/sign-up") ||
    path.startsWith("/auth");

  // Unauthenticated: site root and /app → sign-in
  if (!user && (path === "/" || path.startsWith("/app"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    if (path.startsWith("/app")) {
      url.searchParams.set("next", path + request.nextUrl.search);
    }
    return NextResponse.redirect(url);
  }

  // Authenticated: root or auth pages → dashboard
  if (user && (path === "/" || (isAuthRoute && !path.startsWith("/auth/callback")))) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
