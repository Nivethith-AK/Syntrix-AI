import { Suspense } from "react";

import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Suspense fallback={<div className="text-sm text-[var(--color-muted)]">Loading…</div>}>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}
