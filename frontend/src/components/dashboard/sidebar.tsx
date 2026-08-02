"use client";

import type { ElementType } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  FolderKanban,
  Database,
  FlaskConical,
  Boxes,
  Bot,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LogOut,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { Section } from "@/components/dashboard/types";

interface SidebarProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  email?: string | null;
  displayName?: string | null;
  onSignOut?: () => void;
}

const navItems: { id: Section; label: string; icon: ElementType }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "datasets", label: "Datasets", icon: Database },
  { id: "experiments", label: "Experiments", icon: FlaskConical },
  { id: "models", label: "Models", icon: Boxes },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  activeSection,
  onSectionChange,
  collapsed,
  onCollapsedChange,
  email,
  displayName,
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
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-accent/15 ring-1 ring-accent/30">
            <Sparkles className="w-5 h-5 text-accent" />
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
          const isActive = activeSection === item.id;

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
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-2">
        {!collapsed && (displayName || email) ? (
          <div className="px-3 space-y-0.5">
            {displayName ? (
              <p className="truncate text-sm font-medium text-sidebar-foreground">{displayName}</p>
            ) : null}
            {email ? <p className="truncate text-xs text-muted-foreground">{email}</p> : null}
          </div>
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
