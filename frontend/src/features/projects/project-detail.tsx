"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Database,
  FileText,
  FlaskConical,
  FolderKanban,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { Job } from "@/types/api";

const quickTabs = [
  { tab: "data", label: "Datasets & EDA", icon: Database },
  { tab: "experiments", label: "Experiments", icon: FlaskConical },
  { tab: "agents", label: "Agents", icon: Bot },
  { tab: "reports", label: "Reports", icon: FileText },
] as const;

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
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["workspaces", projectId] });
      await queryClient.invalidateQueries({ queryKey: ["me-stats"] });
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
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded-lg bg-secondary animate-pulse" />
        <div className="h-24 rounded-xl border border-border bg-card animate-pulse" />
        <div className="h-40 rounded-xl border border-border bg-card animate-pulse" />
      </div>
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm">
        <p className="font-medium text-destructive">
          {(projectQuery.error as Error)?.message ?? "Project not found"}
        </p>
        <Link href="/app/projects" className="mt-3 inline-flex items-center gap-1 text-accent hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to projects
        </Link>
      </div>
    );
  }

  const project = projectQuery.data;
  const workspaces = workspacesQuery.data?.items ?? [];
  const firstWs = workspaces[0];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-gradient-to-br from-accent/10 via-card to-card p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <Link
          href="/app/projects"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-accent"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All projects
        </Link>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl tracking-tight sm:text-3xl">
          {project.name}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {project.description ||
            "Workspaces hold datasets, experiments, agents, and reports for this project."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-md border border-border bg-secondary/50 px-2 py-1">
            Status: {project.status}
          </span>
          <span className="rounded-md border border-border bg-secondary/50 px-2 py-1">
            {workspaces.length} workspace{workspaces.length === 1 ? "" : "s"}
          </span>
          <span className="rounded-md border border-border bg-secondary/50 px-2 py-1">
            Updated {new Date(project.updated_at || project.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {firstWs ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {quickTabs.map(({ tab, label, icon: Icon }) => (
            <Link
              key={tab}
              href={`/app/projects/${projectId}/workspaces/${firstWs.id}${
                tab === "data" ? "" : `?tab=${tab}`
              }`}
              className="group rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-accent/40"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-sm font-medium">{label}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Open in {firstWs.name}
                <ArrowRight className="ml-1 inline h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </p>
            </Link>
          ))}
        </div>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-5 animate-in fade-in duration-300">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Workspaces</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Each workspace is an analysis room — data, training, agents, and reports.
            </p>
          </div>
        </div>

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

        {workspacesQuery.isLoading ? (
          <div className="mt-4 space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-secondary/50 animate-pulse" />
            ))}
          </div>
        ) : null}

        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border">
          {workspaces.map((ws) => (
            <li key={ws.id}>
              <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  href={`/app/projects/${projectId}/workspaces/${ws.id}`}
                  className="flex min-w-0 items-start gap-3 hover:text-accent"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <FolderKanban className="h-4 w-4 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{ws.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {ws.description || "Open hub"} · {ws.status}
                    </p>
                  </div>
                </Link>
                <div className="flex flex-wrap gap-1.5 sm:justify-end">
                  {quickTabs.map(({ tab, label }) => (
                    <Link
                      key={tab}
                      href={`/app/projects/${projectId}/workspaces/${ws.id}${
                        tab === "data" ? "" : `?tab=${tab}`
                      }`}
                      className="rounded-md border border-border bg-secondary/40 px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-accent/40 hover:text-foreground"
                    >
                      {label.split(" ")[0]}
                    </Link>
                  ))}
                </div>
              </div>
            </li>
          ))}
          {!workspacesQuery.isLoading && workspaces.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              No workspaces yet — create one above to unlock datasets, experiments, and agents.
            </li>
          ) : null}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Demo async job</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enqueues a Celery hello-task via Redis and polls Postgres for completion.
          {workspaces.length === 0 ? " Create a workspace first." : ""}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            onClick={() => demoJob.mutate()}
            disabled={demoJob.isPending || !!pollId || workspaces.length === 0}
          >
            {demoJob.isPending || pollId ? "Running…" : "Run demo job"}
          </Button>
          {job ? (
            <div className="rounded-lg border border-border px-3 py-2 text-sm">
              <span className="text-muted-foreground">Status:</span>{" "}
              <span className="text-accent">{job.status}</span>
              <span className="mx-2 text-border">·</span>
              <span>{job.progress_pct}%</span>
              {job.result_json?.greeting ? (
                <>
                  <span className="mx-2 text-border">·</span>
                  <span>{String(job.result_json.greeting)}</span>
                </>
              ) : null}
              {job.error_message ? (
                <p className="mt-1 text-destructive">{job.error_message}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
