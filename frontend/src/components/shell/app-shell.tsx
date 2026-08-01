"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import type { Section } from "@/components/dashboard/types";
import { createClient } from "@/lib/supabase/client";

const SECTIONS: Section[] = [
  "overview",
  "pipeline",
  "deals",
  "customers",
  "team",
  "forecasting",
  "reports",
  "settings",
];

function isSection(value: string | null): value is Section {
  return !!value && (SECTIONS as string[]).includes(value);
}

function initialsFromEmail(email?: string | null) {
  if (!email) return "SX";
  const local = email.split("@")[0] ?? "sx";
  return local.slice(0, 2).toUpperCase();
}

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
  const sectionParam = searchParams.get("section");
  const [activeSection, setActiveSection] = useState<Section>(
    isSection(sectionParam) ? sectionParam : "overview",
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isDashboardHome = pathname === "/app";
  const projectsActive = pathname.startsWith("/app/projects");

  useEffect(() => {
    if (!isDashboardHome) return;
    if (isSection(sectionParam)) {
      setActiveSection(sectionParam);
    } else if (!sectionParam) {
      setActiveSection("overview");
    }
  }, [isDashboardHome, sectionParam]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  function handleSectionChange(section: Section) {
    setActiveSection(section);
    const params = new URLSearchParams();
    if (section !== "overview") {
      params.set("section", section);
    }
    const qs = params.toString();
    router.push(qs ? `/app?${qs}` : "/app");
  }

  return (
    <div className="sales-ops-theme flex min-h-screen bg-background text-foreground">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        projectsActive={projectsActive}
        email={email}
        onSignOut={signOut}
      />
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-out ${
          sidebarCollapsed ? "ml-[72px]" : "ml-[260px]"
        }`}
      >
        <Header
          activeSection={activeSection}
          titleOverride={projectsActive ? "Projects" : undefined}
          userInitials={initialsFromEmail(email)}
        />
        <main className="flex-1 p-6 overflow-auto">
          {isDashboardHome ? (
            <div
              key={activeSection}
              className="animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
              <DashboardHome activeSection={activeSection} />
            </div>
          ) : (
            <div className="animate-in fade-in duration-300">{children}</div>
          )}
        </main>
      </div>
    </div>
  );
}
