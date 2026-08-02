"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type Mode = "sign-in" | "sign-up";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.86c2.26-2.08 3.58-5.15 3.58-8.64z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.86-3a7.2 7.2 0 0 1-10.82-3.79H1.3v3.09A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.3A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.58.37-2.3V6.61H1.3A12 12 0 0 0 0 12c0 1.94.46 3.77 1.3 5.39l3.97-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.3 6.61l3.97 3.09A7.18 7.18 0 0 1 12 4.75z"
      />
    </svg>
  );
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/app";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);

  useEffect(() => {
    const verified = searchParams.get("verified");
    const reset = searchParams.get("reset");
    const authError = searchParams.get("error");
    if (verified === "1") {
      setMessage("Email verified. You can sign in now.");
    }
    if (reset === "1") {
      setMessage("Password updated. Sign in with your new password.");
    }
    if (authError === "auth_callback") {
      setError("Authentication failed. Try again or use email sign-in.");
    }
    if (authError === "oauth_provider") {
      setError(
        "Google sign-in is not enabled yet. Enable the Google provider in Supabase Auth settings.",
      );
    }
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setNeedsVerification(false);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    try {
      if (mode === "sign-in") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          if (signInError.message.toLowerCase().includes("email not confirmed")) {
            setNeedsVerification(true);
            setError("Please verify your email before signing in.");
            return;
          }
          throw signInError;
        }
        router.push(next);
        router.refresh();
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo,
          },
        });
        if (signUpError) throw signUpError;

        if (data.session) {
          router.push(next);
          router.refresh();
          return;
        }

        setNeedsVerification(true);
        setMessage(
          "Account created. Check your inbox for a verification link — click it to activate your account.",
        );
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
    setMessage(null);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        scopes: "openid email profile",
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (oauthError) {
      const msg = oauthError.message.toLowerCase();
      if (msg.includes("provider is not enabled") || msg.includes("validation_failed")) {
        setError(
          "Google sign-in is not enabled. In Supabase → Authentication → Providers → Google, add your Client ID/Secret and enable it.",
        );
      } else {
        setError(oauthError.message);
      }
      setLoading(false);
    }
  }

  async function resendVerification() {
    if (!email.trim()) {
      setError("Enter your email above, then resend verification.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}&verified=1`,
        },
      });
      if (resendError) throw resendError;
      setMessage("Verification email sent. Check your inbox (and spam folder).");
    } catch (err) {
      setError((err as Error).message);
    } finally {
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
          {mode === "sign-in"
            ? "Sign in with email or Google to open your workspace."
            : "Create an account — we’ll email you a verification link automatically."}
        </p>
      </div>

      <Button
        type="button"
        variant="secondary"
        className="w-full gap-2"
        onClick={googleSignIn}
        disabled={loading}
      >
        <GoogleIcon />
        Continue with Google
      </Button>

      <div className="my-4 flex items-center gap-3 text-xs text-[var(--color-muted)]">
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        or use email
        <div className="h-px flex-1 bg-[var(--color-border)]" />
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
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="password">Password</Label>
            {mode === "sign-in" ? (
              <Link
                href="/forgot-password"
                className="text-xs text-[var(--color-accent)] hover:underline"
              >
                Forgot password?
              </Link>
            ) : null}
          </div>
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
          {loading ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
        </Button>
      </form>

      {needsVerification ? (
        <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-black/20 p-3">
          <p className="text-sm text-[var(--color-muted)]">
            Didn’t get the email? Resend the verification link.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-3 w-full"
            onClick={resendVerification}
            disabled={loading}
          >
            Resend verification email
          </Button>
        </div>
      ) : null}

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
