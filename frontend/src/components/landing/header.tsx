"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Cube, Lightning } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/ui/button";

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > window.innerHeight * 0.5);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between px-2.5 sm:px-6 lg:px-12">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-baltic-sea-100)]">
                <Cube weight="fill" className="h-5 w-5 text-[var(--color-baltic-sea-950)]" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--color-baltic-sea-950)] bg-[var(--color-keppel-400)]" />
            </div>
            <span
              className={`
                text-xl font-semibold tracking-tight text-[var(--color-baltic-sea-50)]
                transition-all duration-500 overflow-hidden whitespace-nowrap
                ${scrolled ? "max-w-0 opacity-0" : "max-w-[140px] opacity-100"}
              `}
            >
              Syntrix AI
            </span>
          </Link>

          <nav
            className={`
              hidden md:flex items-center gap-1 rounded-full border border-[var(--color-baltic-sea-800)] 
              bg-[var(--color-baltic-sea-900)]/80 backdrop-blur-md px-2 py-1.5
              transition-all duration-500 ease-out
              ${scrolled ? "opacity-0 pointer-events-none" : "opacity-100"}
              absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2
            `}
          >
            <a
              href="#product"
              className="px-4 py-1.5 text-sm text-[var(--color-baltic-sea-100)] rounded-full bg-[var(--color-baltic-sea-800)]"
            >
              Product
            </a>
            <a
              href="#how-it-works"
              className="px-4 py-1.5 text-sm text-[var(--color-baltic-sea-400)] hover:text-[var(--color-baltic-sea-100)] transition-colors"
            >
              How it works
            </a>
            <a
              href="#pricing"
              className="px-4 py-1.5 text-sm text-[var(--color-baltic-sea-400)] hover:text-[var(--color-baltic-sea-100)] transition-colors"
            >
              Pricing
            </a>
            <a
              href="#faq"
              className="px-4 py-1.5 text-sm text-[var(--color-baltic-sea-400)] hover:text-[var(--color-baltic-sea-100)] transition-colors"
            >
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className={`
                hidden text-sm text-[var(--color-baltic-sea-300)] hover:text-[var(--color-baltic-sea-50)] transition-all duration-500 md:inline-flex
                ${scrolled ? "opacity-0 pointer-events-none" : "opacity-100"}
              `}
            >
              Sign in
            </Link>
            <Button
              asChild
              className={`
                bg-[var(--color-keppel-400)] text-[var(--color-keppel-950)] hover:bg-[var(--color-keppel-300)] 
                rounded-full px-5 py-2.5 h-auto text-sm font-semibold
                transition-all duration-500
                ${scrolled ? "opacity-0 pointer-events-none md:opacity-0" : "opacity-100"}
              `}
            >
              <Link href="/sign-up">
                <Lightning weight="fill" className="mr-1.5 h-4 w-4" />
                Get started
              </Link>
            </Button>
            {/* Always-visible Sign in on small screens */}
            <Link
              href="/sign-in"
              className="md:hidden inline-flex items-center rounded-full border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-900)]/80 px-4 py-2 text-sm font-medium text-[var(--color-baltic-sea-100)]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <div
        className={`
          fixed z-50 bottom-6 right-6 lg:right-12
          transition-all duration-500 ease-out
          ${scrolled ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}
        `}
      >
        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="secondary"
            className="rounded-full px-5 py-3 h-auto text-sm border border-[var(--color-baltic-sea-700)] bg-[var(--color-baltic-sea-900)]/90 text-[var(--color-baltic-sea-100)] backdrop-blur-md"
          >
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button
            asChild
            className="bg-[var(--color-keppel-400)] text-[var(--color-keppel-950)] hover:bg-[var(--color-keppel-300)] 
            rounded-full px-6 py-3 h-auto text-sm shadow-lg shadow-[var(--color-keppel-400)]/20 font-semibold"
          >
            <Link href="/sign-up">
              <Lightning weight="fill" className="mr-1.5 h-4 w-4" />
              Get started
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}
