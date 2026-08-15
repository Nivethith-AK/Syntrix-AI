"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FolderKanban, Sparkles } from "lucide-react";

import { api } from "@/lib/api";

export function RecentActivity() {
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: api.listProjects,
  });

  const projects = projectsQuery.data?.items ?? [];

  return (
    <div className="bg-card border border-border rounded-xl p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Your projects</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Open a project to manage workspaces, data, and experiments
          </p>
        </div>
        <Link
          href="/app/projects"
          className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline shrink-0"
        >
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {projectsQuery.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 rounded-lg bg-secondary/50 animate-pulse" />
          ))}
        </div>
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
          Create a project, add a workspace, then upload{" "}
          <code className="text-accent">demo_churn.csv</code>.
          <div className="mt-3">
            <Link
              href="/app/projects"
              className="inline-flex items-center gap-1 text-accent hover:underline"
            >
              Create your first project <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : null}

      <ul className="space-y-2">
        {projects.slice(0, 6).map((project) => (
          <li key={project.id}>
            <Link
              href={`/app/projects/${project.id}`}
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
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
