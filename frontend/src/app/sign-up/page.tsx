import { Suspense } from "react";

import { AuthForm } from "@/features/auth/auth-form";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Suspense fallback={<div className="text-sm text-[var(--color-muted)]">Loading…</div>}>
        <AuthForm mode="sign-up" />
      </Suspense>
    </div>
  );
}
