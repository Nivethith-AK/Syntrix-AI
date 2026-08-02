"use client";

import { useQuery } from "@tanstack/react-query";
import { FolderKanban, Sparkles } from "lucide-react";

import { api } from "@/lib/api";

export function RecentActivity() {
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: api.listProjects,
  });

  const projects = projectsQuery.data?.items ?? [];

  return (
    <div className="bg-card border border-border rounded-xl p-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground">Your projects</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Live from the API — open a project to continue analysis
        </p>
      </div>

      {projectsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground animate-pulse-soft">Loading…</p>
      ) : null}

      {projectsQuery.isError ? (
        <p className="text-sm text-destructive">
          Could not load projects. Is the API running at the configured URL?
        </p>
      ) : null}

      {!projectsQuery.isLoading && !projectsQuery.isError && projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 text-foreground font-medium mb-1">
            <Sparkles className="w-4 h-4 text-accent" />
            No projects yet
          </div>
          Create a project, add a workspace, then upload <code className="text-accent">demo_churn.csv</code>.
        </div>
      ) : null}

      <ul className="space-y-3">
        {projects.slice(0, 6).map((project) => (
          <li
            key={project.id}
            className="flex items-start gap-3 rounded-lg border border-transparent hover:border-border hover:bg-secondary/40 p-2.5 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <FolderKanban className="w-4 h-4 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {project.description || "No description"} · {project.status}
              </p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {new Date(project.updated_at || project.created_at).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
