"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { Job } from "@/types/api";

export function ProjectDetail({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [workspaceName, setWorkspaceName] = useState("");
  const [job, setJob] = useState<Job | null>(null);
  const [pollId, setPollId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api.getProject(projectId),
  });

  const workspacesQuery = useQuery({
    queryKey: ["workspaces", projectId],
    queryFn: () => api.listWorkspaces(projectId),
  });

  const createWorkspace = useMutation({
    mutationFn: () =>
      api.createWorkspace(projectId, { name: workspaceName || "Default workspace" }),
    onSuccess: async () => {
      setWorkspaceName("");
      await queryClient.invalidateQueries({ queryKey: ["workspaces", projectId] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const demoJob = useMutation({
    mutationFn: async () => {
      const firstWorkspace = workspacesQuery.data?.items[0];
      return api.submitDemoJob({
        project_id: projectId,
        workspace_id: firstWorkspace?.id,
        message: `hello from ${projectQuery.data?.name ?? "Syntrix"}`,
      });
    },
    onSuccess: (accepted) => {
      setError(null);
      setPollId(accepted.job_id);
    },
    onError: (err: Error) => setError(err.message),
  });

  useEffect(() => {
    if (!pollId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const next = await api.getJob(pollId);
        if (!cancelled) setJob(next);
        if (["succeeded", "failed", "cancelled"].includes(next.status)) {
          setPollId(null);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
        setPollId(null);
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pollId]);

  if (projectQuery.isLoading) {
    return <p className="animate-pulse-soft text-sm text-[var(--color-muted)]">Loading project…</p>;
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <p className="text-sm text-[var(--color-danger)]">
        {(projectQuery.error as Error)?.message ?? "Project not found"}
      </p>
    );
  }

  const project = projectQuery.data;

  return (
    <div className="space-y-8">
      <header className="animate-fade-up">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Project</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight">
          {project.name}
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--color-muted)]">
          {project.description || "Experiment workspaces and async jobs live here."}
        </p>
      </header>

      <section className="animate-fade-up rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg">Workspaces</h2>
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            createWorkspace.mutate();
          }}
        >
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="ws">Workspace name</Label>
            <Input
              id="ws"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="Baseline investigation"
            />
          </div>
          <Button type="submit" disabled={createWorkspace.isPending}>
            {createWorkspace.isPending ? "Creating…" : "Create workspace"}
          </Button>
        </form>
        <ul className="mt-4 divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)]">
          {(workspacesQuery.data?.items ?? []).map((ws) => (
            <li key={ws.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <Link
                href={`/app/projects/${projectId}/workspaces/${ws.id}`}
                className="text-[var(--color-foreground)] hover:text-[var(--color-accent)]"
              >
                {ws.name}
              </Link>
              <span className="text-[var(--color-muted)]">{ws.status}</span>
            </li>
          ))}
          {workspacesQuery.data && workspacesQuery.data.items.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-[var(--color-muted)]">
              No workspaces yet.
            </li>
          ) : null}
        </ul>
      </section>

      <section className="animate-fade-up rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg">Demo async job</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Enqueues a Celery hello-task via Redis and polls Postgres for completion.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            onClick={() => demoJob.mutate()}
            disabled={demoJob.isPending || !!pollId}
          >
            {demoJob.isPending || pollId ? "Running…" : "Run demo job"}
          </Button>
          {job ? (
            <div className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm">
              <span className="text-[var(--color-muted)]">Status:</span>{" "}
              <span className="text-[var(--color-accent)]">{job.status}</span>
              <span className="mx-2 text-[var(--color-border-strong)]">·</span>
              <span>{job.progress_pct}%</span>
              {job.result_json?.greeting ? (
                <>
                  <span className="mx-2 text-[var(--color-border-strong)]">·</span>
                  <span>{String(job.result_json.greeting)}</span>
                </>
              ) : null}
              {job.error_message ? (
                <p className="mt-1 text-[var(--color-danger)]">{job.error_message}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
    </div>
  );
}
