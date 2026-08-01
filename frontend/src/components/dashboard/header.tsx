"use client";

import { useState } from "react";
import { Bell, Search, Calendar } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Section } from "@/components/dashboard/types";

interface HeaderProps {
  activeSection: Section;
  titleOverride?: string;
  userInitials?: string;
}

const sectionTitles: Record<Section, string> = {
  overview: "Overview",
  pipeline: "Pipeline",
  deals: "Deals",
  customers: "Customers",
  team: "Team Performance",
  forecasting: "Forecasting",
  reports: "Reports",
  settings: "Settings",
};

export function Header({ activeSection, titleOverride, userInitials = "SX" }: HeaderProps) {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-6">
      <div className="flex items-center gap-6">
        <h1 className="text-xl font-semibold text-foreground">
          {titleOverride ?? sectionTitles[activeSection]}
        </h1>
        {!titleOverride ? (
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Last 30 days</span>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-4">
        <div
          className={cn(
            "relative flex items-center transition-all duration-300",
            searchFocused ? "w-64" : "w-48",
          )}
        >
          <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-accent transition-all duration-200"
          />
        </div>

        <button
          type="button"
          className="relative w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full animate-pulse" />
        </button>

        <button
          type="button"
          className="w-9 h-9 rounded-lg overflow-hidden bg-secondary ring-2 ring-transparent hover:ring-accent/50 transition-all duration-200"
        >
          <div className="w-full h-full bg-gradient-to-br from-accent/80 to-chart-1 flex items-center justify-center text-xs font-semibold text-accent-foreground">
            {userInitials}
          </div>
        </button>
      </div>
    </header>
  );
}
