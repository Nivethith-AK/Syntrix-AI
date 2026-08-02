"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/update-password")}`,
      });
      if (resetError) throw resetError;
      setMessage(
        "If an account exists for that email, a reset link is on the way. Check your inbox and spam folder.",
      );
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
        <h1 className="mt-3 text-xl font-medium">Forgot password</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Enter your account email and we’ll send a secure reset link.
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
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      {error ? <p className="mt-4 text-sm text-[var(--color-danger)]">{error}</p> : null}
      {message ? <p className="mt-4 text-sm text-[var(--color-success)]">{message}</p> : null}

      <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
        Remembered it?{" "}
        <Link className="text-[var(--color-accent)] hover:underline" href="/sign-in">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
