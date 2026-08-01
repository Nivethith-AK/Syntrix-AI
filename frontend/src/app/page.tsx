import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-64 w-[40rem] -translate-x-1/2 rounded-full bg-[var(--color-accent)]/10 blur-3xl animate-pulse-soft" />
      </div>
      <div className="relative z-10 max-w-2xl animate-fade-up text-center">
        <p className="font-[family-name:var(--font-display)] text-5xl tracking-tight sm:text-6xl">
          Syntrix <span className="text-[var(--color-accent)]">AI</span>
        </p>
        <p className="mt-4 text-balance text-lg text-[var(--color-muted)]">
          Autonomous data intelligence — auth, projects, workspaces, and async jobs foundation.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/sign-up">Create account</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
