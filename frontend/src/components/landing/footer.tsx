import Link from "next/link"
import { Cube, GithubLogo, TwitterLogo, DiscordLogo } from "@phosphor-icons/react/dist/ssr"

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-baltic-sea-900)] py-16">
      <div className="mx-auto max-w-[1400px] px-2.5 sm:px-6 lg:px-12">
        <div className="flex flex-col gap-12 lg:flex-row lg:justify-between">
          {/* Brand column */}
          <div className="lg:max-w-xs">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-baltic-sea-800)]">
                <Cube weight="fill" className="h-5 w-5 text-[var(--color-baltic-sea-400)]" />
              </div>
              <span className="text-xl font-semibold text-[var(--color-baltic-sea-300)]">Syntrix AI</span>
            </Link>
            <p className="mt-4 text-sm text-[var(--color-baltic-sea-500)]">
              Autonomous AI data intelligence — EDA, training, explanations, and reports in one platform.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-baltic-sea-800)] hover:border-[var(--color-keppel-700)] hover:bg-[var(--color-keppel-950)] transition-colors"
              >
                <GithubLogo weight="fill" className="h-4 w-4 text-[var(--color-baltic-sea-500)]" />
              </a>
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-baltic-sea-800)] hover:border-[var(--color-keppel-700)] hover:bg-[var(--color-keppel-950)] transition-colors"
              >
                <TwitterLogo weight="fill" className="h-4 w-4 text-[var(--color-baltic-sea-500)]" />
              </a>
              <a
                href="#"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-baltic-sea-800)] hover:border-[var(--color-keppel-700)] hover:bg-[var(--color-keppel-950)] transition-colors"
              >
                <DiscordLogo weight="fill" className="h-4 w-4 text-[var(--color-baltic-sea-500)]" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:gap-16">
            <div>
              <h4 className="text-sm font-medium text-[var(--color-baltic-sea-200)]">Product</h4>
              <ul className="mt-4 space-y-3">
                <li>
                  <a
                    href="#product"
                    className="text-sm text-[var(--color-baltic-sea-500)] hover:text-[var(--color-keppel-400)] transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="text-sm text-[var(--color-baltic-sea-500)] hover:text-[var(--color-keppel-400)] transition-colors"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a
                    href="#faq"
                    className="text-sm text-[var(--color-baltic-sea-500)] hover:text-[var(--color-keppel-400)] transition-colors"
                  >
                    FAQ
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-[var(--color-baltic-sea-200)]">Developers</h4>
              <ul className="mt-4 space-y-3">
                <li>
                  <Link
                    href="/sign-in"
                    className="text-sm text-[var(--color-baltic-sea-500)] hover:text-[var(--color-keppel-400)] transition-colors"
                  >
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link
                    href="/sign-up"
                    className="text-sm text-[var(--color-baltic-sea-500)] hover:text-[var(--color-keppel-400)] transition-colors"
                  >
                    Create account
                  </Link>
                </li>
                <li>
                  <a
                    href="#how-it-works"
                    className="text-sm text-[var(--color-baltic-sea-500)] hover:text-[var(--color-keppel-400)] transition-colors"
                  >
                    How it works
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-[var(--color-baltic-sea-200)]">Company</h4>
              <ul className="mt-4 space-y-3">
                <li>
                  <a
                    href="#product"
                    className="text-sm text-[var(--color-baltic-sea-500)] hover:text-[var(--color-keppel-400)] transition-colors"
                  >
                    About
                  </a>
                </li>
                <li>
                  <a
                    href="#how-it-works"
                    className="text-sm text-[var(--color-baltic-sea-500)] hover:text-[var(--color-keppel-400)] transition-colors"
                  >
                    How it works
                  </a>
                </li>
                <li>
                  <a
                    href="/sign-up"
                    className="text-sm text-[var(--color-baltic-sea-500)] hover:text-[var(--color-keppel-400)] transition-colors"
                  >
                    Get started
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-[var(--color-baltic-sea-200)]">Account</h4>
              <ul className="mt-4 space-y-3">
                <li>
                  <Link
                    href="/sign-in"
                    className="text-sm text-[var(--color-baltic-sea-500)] hover:text-[var(--color-keppel-400)] transition-colors"
                  >
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-[var(--color-baltic-sea-500)] hover:text-[var(--color-keppel-400)] transition-colors"
                  >
                    Reset password
                  </Link>
                </li>
                <li>
                  <Link
                    href="/app"
                    className="text-sm text-[var(--color-baltic-sea-500)] hover:text-[var(--color-keppel-400)] transition-colors"
                  >
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-[var(--color-baltic-sea-900)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-[var(--color-baltic-sea-600)]">© 2026 Syntrix AI. All rights reserved.</span>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--color-keppel-400)] animate-pulse" />
            <span className="text-xs text-[var(--color-baltic-sea-500)]">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
