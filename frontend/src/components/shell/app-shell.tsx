"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import type { Section } from "@/components/dashboard/types";
import { api } from "@/lib/api";
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
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const meQuery = useQuery({ queryKey: ["me"], queryFn: api.me });

  const isDashboardHome = pathname === "/app";
  const isProjectsRoute = pathname.startsWith("/app/projects");

  useEffect(() => {
    if (isProjectsRoute) {
      setActiveSection("projects");
    } else if (isDashboardHome) {
      setActiveSection((current) => current || "overview");
    }
  }, [isDashboardHome, isProjectsRoute]);

  useEffect(() => {
    const prefs = meQuery.data?.preferences;
    if (prefs?.compact_nav === true) {
      setSidebarCollapsed(true);
    }
  }, [meQuery.data?.preferences]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  function handleSectionChange(section: Section) {
    setActiveSection(section);
    if (!isDashboardHome) {
      router.push("/app");
    }
  }

  const profileEmail = meQuery.data?.email || email;
  const displayName = meQuery.data?.display_name;

  return (
    <div className="syntrix-theme flex min-h-screen bg-background text-foreground">
      <Sidebar
        activeSection={isProjectsRoute ? "projects" : activeSection}
        onSectionChange={handleSectionChange}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        email={profileEmail}
        displayName={displayName}
        onSignOut={signOut}
      />
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-out ${
          sidebarCollapsed ? "ml-[72px]" : "ml-[260px]"
        }`}
      >
        <Header
          activeSection={isProjectsRoute ? "projects" : activeSection}
          onOpenSettings={() => handleSectionChange("settings")}
        />
        <main className="flex-1 p-6 overflow-auto">
          {isDashboardHome ? (
            <div
              key={activeSection}
              className="animate-in fade-in slide-in-from-bottom-4 duration-500"
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
