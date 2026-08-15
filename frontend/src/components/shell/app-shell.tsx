"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Menu, X } from "lucide-react";

import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import type { Section } from "@/components/dashboard/types";
import { api } from "@/lib/api";
import { parseDashboardSection } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/client";

export function AppShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const meQuery = useQuery({ queryKey: ["me"], queryFn: api.me });

  const isDashboardHome = pathname === "/app";
  const isProjectsRoute = pathname.startsWith("/app/projects");

  const activeSection: Section = useMemo(() => {
    if (isProjectsRoute) return "projects";
    if (isDashboardHome) return parseDashboardSection(searchParams.get("section"));
    return "overview";
  }, [isDashboardHome, isProjectsRoute, searchParams]);

  const headerTitle = useMemo(() => {
    if (!isProjectsRoute) return undefined;
    const parts = pathname.split("/").filter(Boolean);
    // /app/projects
    if (parts.length <= 2) return "Projects";
    if (parts.includes("eda")) return "EDA explorer";
    if (parts.includes("workspaces")) return "Workspace hub";
    // /app/projects/:id
    if (parts.length === 3) return "Project overview";
    return "Projects";
  }, [isProjectsRoute, pathname]);

  useEffect(() => {
    const prefs = meQuery.data?.preferences;
    if (typeof prefs?.compact_nav === "boolean") {
      setSidebarCollapsed(prefs.compact_nav);
    }
  }, [meQuery.data?.preferences?.compact_nav]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (searchParams.get("verified") === "1" && isDashboardHome) {
      // Soft notice via sessionStorage so it only flashes once.
      try {
        sessionStorage.setItem("syntrix_verified_banner", "1");
      } catch {
        /* ignore */
      }
    }
  }, [isDashboardHome, searchParams]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  function handleSectionChange(section: Section) {
    setMobileOpen(false);
    if (section === "projects") {
      router.push("/app/projects");
      return;
    }
    const params = new URLSearchParams();
    if (section !== "overview") params.set("section", section);
    const qs = params.toString();
    router.push(qs ? `/app?${qs}` : "/app");
  }

  const profileEmail = meQuery.data?.email || email;
  const displayName = meQuery.data?.display_name;
  const mainOffset = sidebarCollapsed ? "md:ml-[72px]" : "md:ml-[260px]";

  return (
    <div className="syntrix-theme flex min-h-screen bg-background text-foreground">
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div
        className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <Sidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
          email={profileEmail}
          displayName={displayName}
          onSignOut={signOut}
        />
      </div>

      <div className={`flex-1 flex flex-col transition-all duration-300 ease-out ${mainOffset}`}>
        <div className="md:hidden sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur">
          <button
            type="button"
            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <span className="font-semibold">
            Syntrix <span className="text-accent">AI</span>
          </span>
        </div>

        <Header
          activeSection={activeSection}
          titleOverride={headerTitle}
          onOpenSettings={() => handleSectionChange("settings")}
        />
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {isDashboardHome ? (
            <div
              key={activeSection}
              className="animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <DashboardHome activeSection={activeSection} onNavigate={handleSectionChange} />
            </div>
          ) : (
            <div className="animate-in fade-in duration-300">{children}</div>
          )}
        </main>
      </div>
    </div>
  );
}
