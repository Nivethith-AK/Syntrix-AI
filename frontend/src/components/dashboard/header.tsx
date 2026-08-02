"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, Search, Sparkles } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Section } from "@/components/dashboard/types";

interface HeaderProps {
  activeSection: Section;
  titleOverride?: string;
  onOpenSettings?: () => void;
  onSearchSelectProject?: (projectId: string) => void;
}

const sectionTitles: Record<Section, string> = {
  overview: "Command Center",
  projects: "Projects",
  datasets: "Datasets & EDA",
  experiments: "Experiments",
  models: "Models",
  agents: "Agents",
  reports: "Reports",
  settings: "Settings",
};

const sectionSubtitles: Record<Section, string> = {
  overview: "Your autonomous data intelligence workspace",
  projects: "Organize workspaces and analyses",
  datasets: "Upload, profile, and explore data",
  experiments: "Train, compare, and track runs",
  models: "Champions, predictions, and explanations",
  agents: "LangGraph workflows and agent activity",
  reports: "Markdown + PDF narrative outputs",
  settings: "Account and platform preferences",
};

function initials(name?: string | null, email?: string | null) {
  const source = (name || email || "SX").trim();
  return source.slice(0, 2).toUpperCase();
}

export function Header({
  activeSection,
  titleOverride,
  onOpenSettings,
}: HeaderProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const [query, setQuery] = useState("");
  const meQuery = useQuery({ queryKey: ["me"], queryFn: api.me });
  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: api.listProjects });
  const title = titleOverride ?? sectionTitles[activeSection];

  const notifyJobs = meQuery.data?.preferences?.notify_jobs !== false;
  const displayName = meQuery.data?.display_name;
  const email = meQuery.data?.email;
  const avatarUrl = meQuery.data?.avatar_url;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return (projectsQuery.data?.items ?? [])
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [projectsQuery.data?.items, query]);

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-30 flex items-center justify-between px-6">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-foreground truncate">{title}</h1>
        {!titleOverride ? (
          <p className="hidden sm:block text-xs text-muted-foreground mt-0.5 truncate">
            {sectionSubtitles[activeSection]}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <div
          className={cn(
            "relative hidden md:block transition-all duration-300",
            searchFocused ? "w-72" : "w-52",
          )}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects…"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-accent transition-all duration-200"
          />
          {searchFocused && query.trim() ? (
            <div className="absolute top-11 left-0 right-0 rounded-lg border border-border bg-card shadow-xl overflow-hidden z-50">
              {results.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">No projects found</p>
              ) : (
                results.map((project) => (
                  <Link
                    key={project.id}
                    href={`/app/projects/${project.id}`}
                    className="block px-3 py-2 text-sm hover:bg-secondary/70"
                  >
                    <p className="font-medium truncate">{project.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {project.description || project.status}
                    </p>
                  </Link>
                ))
              )}
            </div>
          ) : null}
        </div>

        <div className="hidden lg:flex items-center gap-1.5 rounded-lg border border-border bg-secondary/60 px-2.5 py-1.5 text-xs text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span>AI ready</span>
        </div>

        <button
          type="button"
          className="relative w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200"
          title={notifyJobs ? "Notifications enabled" : "Notifications muted"}
        >
          <Bell className="w-5 h-5" />
          {notifyJobs ? (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full animate-pulse" />
          ) : null}
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          title={displayName || email || "Profile"}
          className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-secondary transition-all duration-200"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="w-9 h-9 rounded-lg object-cover border border-border"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent/80 to-chart-1 flex items-center justify-center text-xs font-semibold text-accent-foreground">
              {initials(displayName, email)}
            </div>
          )}
          <span className="hidden xl:block max-w-[140px] truncate text-sm text-foreground">
            {displayName || email?.split("@")[0] || "Profile"}
          </span>
        </button>
      </div>
    </header>
  );
}
