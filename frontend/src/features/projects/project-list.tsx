"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, FolderKanban, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

export function ProjectList() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: api.listProjects,
  });

  const createMutation = useMutation({
    mutationFn: () => api.createProject({ name, description: description || undefined }),
    onSuccess: async () => {
      setName("");
      setDescription("");
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["projects"] }),
        queryClient.invalidateQueries({ queryKey: ["me-stats"] }),
      ]);
    },
    onError: (err: Error) => setError(err.message),
  });

  const projects = projectsQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <h2 className="text-lg font-semibold">Create project</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Projects organize experiment workspaces for datasets, training, agents, and reports.
        </p>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            createMutation.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Churn Analysis"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating…" : "Create"}
          </Button>
        </form>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </section>

      <section className="space-y-3 animate-in fade-in duration-300">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Your projects</h2>
          <span className="text-xs text-muted-foreground">
            {projectsQuery.isLoading ? "…" : `${projects.length} total`}
          </span>
        </div>

        {projectsQuery.isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl border border-border bg-card/60 animate-pulse" />
            ))}
          </div>
        ) : null}

        {projectsQuery.isError ? (
          <p className="text-sm text-destructive">
            {(projectsQuery.error as Error).message}
          </p>
        ) : null}

        {!projectsQuery.isLoading && !projectsQuery.isError && projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/60 p-6 text-sm text-muted-foreground">
            <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-accent" />
              No projects yet
            </div>
            Create a project above, add a workspace, then upload{" "}
            <code className="text-accent">demo_churn.csv</code>.
          </div>
        ) : null}

        {projects.length > 0 ? (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/app/projects/${project.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-secondary/50"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                      <FolderKanban className="h-4 w-4 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{project.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {project.description || "No description"}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs uppercase tracking-wide text-accent">
                      {project.status}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
