import { Suspense } from "react";

import { UpdatePasswordForm } from "@/features/auth/update-password-form";

export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Suspense fallback={<div className="text-sm text-[var(--color-muted)]">Loading…</div>}>
        <UpdatePasswordForm />
      </Suspense>
    </div>
  );
}
