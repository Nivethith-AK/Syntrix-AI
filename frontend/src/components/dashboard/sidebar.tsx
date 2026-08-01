"use client";

import type { ElementType } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  GitBranch,
  Handshake,
  Users,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Building2,
  TrendingUp,
  Settings,
  FolderKanban,
  LogOut,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { Section } from "@/components/dashboard/types";

interface SidebarProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  projectsActive?: boolean;
  email?: string | null;
  onSignOut?: () => void;
}

const navItems: { id: Section; label: string; icon: ElementType }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "pipeline", label: "Pipeline", icon: GitBranch },
  { id: "deals", label: "Deals", icon: Handshake },
  { id: "customers", label: "Customers", icon: Building2 },
  { id: "team", label: "Team", icon: Users },
  { id: "forecasting", label: "Forecasting", icon: TrendingUp },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  activeSection,
  onSectionChange,
  collapsed,
  onCollapsedChange,
  projectsActive = false,
  email,
  onSignOut,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-out flex flex-col",
        collapsed ? "w-[72px]" : "w-[260px]",
      )}
    >
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <Link href="/app" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-white">
            <CircleDollarSign className="w-5 h-5 text-accent-foreground" />
          </div>
          <span
            className={cn(
              "font-semibold text-lg text-sidebar-foreground whitespace-nowrap transition-all duration-300",
              collapsed ? "opacity-0 w-0" : "opacity-100 w-auto",
            )}
          >
            Syntrix <span className="text-accent">AI</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = !projectsActive && activeSection === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSectionChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
              )}
            >
              <span
                className={cn(
                  "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-accent transition-all duration-300",
                  isActive ? "opacity-100" : "opacity-0",
                )}
              />
              <Icon
                className={cn(
                  "w-5 h-5 shrink-0 transition-transform duration-200",
                  isActive ? "text-accent" : "group-hover:scale-110",
                )}
              />
              <span
                className={cn(
                  "whitespace-nowrap transition-all duration-300",
                  collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100",
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        <div className={cn("pt-3 mt-3 border-t border-sidebar-border", collapsed && "px-0")}>
          <Link
            href="/app/projects"
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
              projectsActive
                ? "bg-sidebar-accent text-sidebar-foreground"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
            )}
          >
            <span
              className={cn(
                "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-accent transition-all duration-300",
                projectsActive ? "opacity-100" : "opacity-0",
              )}
            />
            <FolderKanban
              className={cn(
                "w-5 h-5 shrink-0",
                projectsActive ? "text-accent" : "group-hover:scale-110 transition-transform duration-200",
              )}
            />
            <span
              className={cn(
                "whitespace-nowrap transition-all duration-300",
                collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100",
              )}
            >
              Projects
            </span>
          </Link>
        </div>
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-2">
        {!collapsed && email ? (
          <p className="px-3 truncate text-xs text-muted-foreground">{email}</p>
        ) : null}
        {onSignOut ? (
          <button
            type="button"
            onClick={onSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            {!collapsed ? <span>Sign out</span> : null}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onCollapsedChange(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
