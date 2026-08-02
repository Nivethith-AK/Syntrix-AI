"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { KeyRound, Server, Database, Shield, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

function initials(name?: string | null, email?: string | null) {
  const source = (name || email || "SX").trim();
  return source.slice(0, 2).toUpperCase();
}

export function SettingsSection() {
  const qc = useQueryClient();
  const meQuery = useQuery({ queryKey: ["me"], queryFn: api.me });
  const { apiUrl, supabaseUrl } = getPublicEnv();

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [notifyJobs, setNotifyJobs] = useState(true);
  const [compactNav, setCompactNav] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (!meQuery.data) return;
    setDisplayName(meQuery.data.display_name ?? "");
    setAvatarUrl(meQuery.data.avatar_url ?? "");
    const prefs = meQuery.data.preferences ?? {};
    setNotifyJobs(prefs.notify_jobs !== false);
    setCompactNav(prefs.compact_nav === true);
  }, [meQuery.data]);

  const saveProfile = useMutation({
    mutationFn: () =>
      api.updateMe({
        display_name: displayName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        preferences: {
          ...(meQuery.data?.preferences ?? {}),
          notify_jobs: notifyJobs,
          compact_nav: compactNav,
        },
      }),
    onSuccess: async () => {
      setMessage("Profile saved");
      setError(null);
      await qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err: Error) => {
      setError(err.message);
      setMessage(null);
    },
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      if (newPassword.length < 6) {
        throw new Error("New password must be at least 6 characters");
      }
      if (newPassword !== confirmPassword) {
        throw new Error("Passwords do not match");
      }
      const supabase = createClient();
      const email = meQuery.data?.email;
      if (!email) throw new Error("Email not available");

      // Re-authenticate, then update password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signInError) throw new Error("Current password is incorrect");

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      setPasswordMessage("Password updated");
      setPasswordError(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: Error) => {
      setPasswordError(err.message);
      setPasswordMessage(null);
    },
  });

  const profile = meQuery.data;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-4">
          {avatarUrl.trim() ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl.trim()}
              alt="Avatar"
              className="h-16 w-16 rounded-xl object-cover border border-border"
            />
          ) : (
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-accent/80 to-chart-1 flex items-center justify-center text-lg font-semibold text-accent-foreground">
              {initials(displayName || profile?.display_name, profile?.email)}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <UserRound className="w-4 h-4 text-accent" />
              Profile
            </h2>
            <p className="text-sm text-muted-foreground truncate">{profile?.email ?? "Loading…"}</p>
          </div>
        </div>

        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            saveProfile.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile?.email ?? ""} disabled />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="avatarUrl">Avatar URL</Label>
            <Input
              id="avatarUrl"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>

          <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
            <p className="text-sm font-medium">Preferences</p>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm">Job notifications badge</p>
                <p className="text-xs text-muted-foreground">Show activity indicator in the header</p>
              </div>
              <Switch checked={notifyJobs} onCheckedChange={setNotifyJobs} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm">Compact navigation hint</p>
                <p className="text-xs text-muted-foreground">Saved to your profile preferences</p>
              </div>
              <Switch checked={compactNav} onCheckedChange={setCompactNav} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saveProfile.isPending || meQuery.isLoading}>
              {saveProfile.isPending ? "Saving…" : "Save profile"}
            </Button>
            <p className="text-xs text-muted-foreground font-mono truncate">
              {profile?.id ? `ID ${profile.id.slice(0, 8)}…` : ""}
            </p>
          </div>
          {message ? <p className="text-sm text-success">{message}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </form>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Change your Supabase account password. Google-only accounts may need email/password enabled.
        </p>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            changePassword.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">Current</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">New</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" variant="secondary" disabled={changePassword.isPending}>
              {changePassword.isPending ? "Updating…" : "Update password"}
            </Button>
          </div>
        </form>
        {passwordMessage ? <p className="mt-3 text-sm text-success">{passwordMessage}</p> : null}
        {passwordError ? <p className="mt-3 text-sm text-destructive">{passwordError}</p> : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Server className="w-4 h-4 text-accent" />
            <h3 className="font-medium">API</h3>
          </div>
          <p className="text-xs text-muted-foreground break-all">{apiUrl}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-accent" />
            <h3 className="font-medium">Supabase</h3>
          </div>
          <p className="text-xs text-muted-foreground break-all">{supabaseUrl || "Not configured"}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="w-4 h-4 text-accent" />
            <h3 className="font-medium">Auth</h3>
          </div>
          <p className="text-sm text-muted-foreground">Email/password + Google OAuth via Supabase.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-accent" />
            <h3 className="font-medium">Access control</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            RLS + API checks: resource owner must match auth user.
          </p>
        </div>
      </div>
    </div>
  );
}
