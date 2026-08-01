"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

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
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="space-y-8">
      <section className="animate-fade-up rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg">Create project</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Projects organize experiment workspaces for your analyses.
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
        {error ? <p className="mt-3 text-sm text-[var(--color-danger)]">{error}</p> : null}
      </section>

      <section className="animate-fade-up space-y-3" style={{ animationDelay: "80ms" }}>
        <h2 className="font-[family-name:var(--font-display)] text-lg">Your projects</h2>
        {projectsQuery.isLoading ? (
          <p className="animate-pulse-soft text-sm text-[var(--color-muted)]">Loading projects…</p>
        ) : null}
        {projectsQuery.isError ? (
          <p className="text-sm text-[var(--color-danger)]">
            {(projectsQuery.error as Error).message}
          </p>
        ) : null}
        <ul className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/50">
          {(projectsQuery.data?.items ?? []).map((project) => (
            <li key={project.id}>
              <Link
                href={`/app/projects/${project.id}`}
                className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-white/5"
              >
                <div>
                  <p className="font-medium">{project.name}</p>
                  <p className="text-sm text-[var(--color-muted)]">
                    {project.description || "No description"}
                  </p>
                </div>
                <span className="text-xs uppercase tracking-wide text-[var(--color-accent)]">
                  {project.status}
                </span>
              </Link>
            </li>
          ))}
          {projectsQuery.data && projectsQuery.data.items.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-[var(--color-muted)]">
              No projects yet. Create your first one above.
            </li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
