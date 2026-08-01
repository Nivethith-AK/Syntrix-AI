"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type Mode = "sign-in" | "sign-up";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/app";
  const envError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    envError === "missing_env"
      ? "App is missing Supabase env vars. Check frontend/.env.local."
      : null,
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();

    try {
      if (mode === "sign-in") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        // Always land on the Syntrix dashboard after login.
        router.push(next.startsWith("/app") ? next : "/app");
        router.refresh();
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (signUpError) throw signUpError;
        setMessage("Check your email to confirm your account, or sign in if confirmations are disabled.");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function googleSignIn() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md animate-fade-up rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="mb-6">
        <p className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
          Syntrix <span className="text-[var(--color-accent)]">AI</span>
        </p>
        <h1 className="mt-3 text-xl font-medium">
          {mode === "sign-in" ? "Sign in" : "Create account"}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Dark enterprise shell for autonomous data intelligence.
        </p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Sign up"}
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-[var(--color-muted)]">
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        or
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={googleSignIn}
        disabled={loading}
      >
        Continue with Google
      </Button>

      {error ? <p className="mt-4 text-sm text-[var(--color-danger)]">{error}</p> : null}
      {message ? <p className="mt-4 text-sm text-[var(--color-success)]">{message}</p> : null}

      <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
        {mode === "sign-in" ? (
          <>
            No account?{" "}
            <Link className="text-[var(--color-accent)] hover:underline" href="/sign-up">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already registered?{" "}
            <Link className="text-[var(--color-accent)] hover:underline" href="/sign-in">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
