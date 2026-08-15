"use client";

import Link from "next/link";
import { ArrowRight, FolderKanban } from "lucide-react";

import { useWorkspaceCatalog } from "@/hooks/use-workspace-catalog";
import type { WorkspaceHubTab } from "@/lib/safe-next";

export function WorkspacePicker({
  title,
  description,
  emptyHint,
  tab,
}: {
  title: string;
  description: string;
  emptyHint: string;
  tab?: WorkspaceHubTab;
}) {
  const { workspaces, isLoading, isError, error } = useWorkspaceCatalog();

  function hrefFor(ws: { project_id: string; id: string }) {
    const base = `/app/projects/${ws.project_id}/workspaces/${ws.id}`;
    return tab && tab !== "data" ? `${base}?tab=${tab}` : base;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{description}</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-16 rounded-xl border border-border bg-card/60 animate-pulse"
            />
          ))}
        </div>
      ) : null}

      {isError ? <p className="text-sm text-destructive">{error}</p> : null}

      {!isLoading && workspaces.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/60 p-6 text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Nothing here yet</p>
          <p>
            {emptyHint}{" "}
            <Link href="/app/projects" className="text-accent hover:underline">
              Create a project
            </Link>
            , add a workspace, then come back.
          </p>
        </div>
      ) : null}

      {!isLoading && workspaces.length > 0 ? (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
          {workspaces.map((ws) => (
            <li key={ws.id}>
              <Link
                href={hrefFor(ws)}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <FolderKanban className="w-4 h-4 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{ws.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {ws.project_name} · {ws.status}
                      {tab ? ` · opens ${tab}` : ""}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
