"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setChecking(false);
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage("Password updated. Redirecting to sign in…");
      await supabase.auth.signOut();
      router.push("/sign-in?reset=1");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="text-sm text-[var(--color-muted)]">Checking reset session…</div>
    );
  }

  if (!hasSession) {
    return (
      <div className="mx-auto w-full max-w-md animate-fade-up rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6">
        <h1 className="text-xl font-medium">Reset link required</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Open the password reset link from your email first, then you’ll land here to set a new
          password.
        </p>
        <Link
          href="/forgot-password"
          className="mt-4 inline-block text-sm text-[var(--color-accent)] hover:underline"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md animate-fade-up rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur">
      <div className="mb-6">
        <p className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
          Syntrix <span className="text-[var(--color-accent)]">AI</span>
        </p>
        <h1 className="mt-3 text-xl font-medium">Set new password</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Choose a new password for your Syntrix account.
        </p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? "Updating…" : "Update password"}
        </Button>
      </form>

      {error ? <p className="mt-4 text-sm text-[var(--color-danger)]">{error}</p> : null}
      {message ? <p className="mt-4 text-sm text-[var(--color-success)]">{message}</p> : null}
    </div>
  );
}
