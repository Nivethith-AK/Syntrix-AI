"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { DatasetVersion, Job } from "@/types/api";

type Tab = "data" | "experiments" | "agents" | "reports" | "chat";

export function WorkspaceHub({
  projectId,
  workspaceId,
}: {
  projectId: string;
  workspaceId: string;
}) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("data");
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [pollId, setPollId] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [target, setTarget] = useState("");
  const [taskType, setTaskType] = useState("classification");
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [predictJson, setPredictJson] = useState('{"feature": 1}');
  const [predictResult, setPredictResult] = useState<string | null>(null);
  const [explainPreview, setExplainPreview] = useState<string | null>(null);
  const [resumeTarget, setResumeTarget] = useState("");

  const workspaceQuery = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () => api.getWorkspace(workspaceId),
  });
  const versionsQuery = useQuery({
    queryKey: ["versions", workspaceId],
    queryFn: () => api.listDatasetVersions(workspaceId),
  });
  const experimentsQuery = useQuery({
    queryKey: ["experiments", workspaceId],
    queryFn: () => api.listExperiments(workspaceId),
    enabled: tab === "experiments",
  });
  const modelsQuery = useQuery({
    queryKey: ["models", workspaceId],
    queryFn: () => api.listModels(workspaceId),
    enabled: tab === "experiments",
  });
  const runsQuery = useQuery({
    queryKey: ["agent-runs", workspaceId],
    queryFn: () => api.listAgentRuns(workspaceId),
    enabled: tab === "agents",
    refetchInterval: tab === "agents" ? 2000 : false,
  });
  const activitiesQuery = useQuery({
    queryKey: ["agent-activities", workspaceId],
    queryFn: () => api.listAgentActivities(workspaceId),
    enabled: tab === "agents",
    refetchInterval: tab === "agents" ? 2000 : false,
  });
  const reportsQuery = useQuery({
    queryKey: ["reports", workspaceId],
    queryFn: () => api.listReports(workspaceId),
    enabled: tab === "reports",
  });

  const versionId = selectedVersion || versionsQuery.data?.items[0]?.id || null;

  const metaQuery = useQuery({
    queryKey: ["metadata", versionId],
    queryFn: () => api.getDatasetMetadata(versionId!),
    enabled: !!versionId && (tab === "data" || tab === "experiments"),
    retry: false,
  });
  const previewQuery = useQuery({
    queryKey: ["preview", versionId],
    queryFn: () => api.getDatasetPreview(versionId!),
    enabled: !!versionId && tab === "data",
    retry: false,
  });
  const edaQuery = useQuery({
    queryKey: ["eda", versionId],
    queryFn: () => api.getEda(versionId!),
    enabled: !!versionId && tab === "data",
    retry: false,
  });
  const chatQuery = useQuery({
    queryKey: ["conversation", chatId],
    queryFn: () => api.getConversation(chatId!),
    enabled: !!chatId && tab === "chat",
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
          await qc.invalidateQueries();
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
        setPollId(null);
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 1200);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pollId, qc]);

  const upload = useMutation({
    mutationFn: (file: File) => api.uploadDataset(workspaceId, file),
    onSuccess: async (res) => {
      setError(null);
      setSelectedVersion(res.dataset_version.id);
      setPollId(res.job_id);
      await qc.invalidateQueries({ queryKey: ["versions", workspaceId] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const train = useMutation({
    mutationFn: () =>
      api.createExperiment(workspaceId, {
        dataset_version_id: versionId!,
        name: `Train ${taskType}`,
        task_type: taskType,
        target_column: taskType === "clustering" ? null : target,
        algorithms:
          taskType === "clustering"
            ? ["kmeans"]
            : ["random_forest", "logistic_regression", "xgboost"],
      }),
    onSuccess: (res) => {
      setPollId(res.job_id);
      setTab("experiments");
    },
    onError: (err: Error) => setError(err.message),
  });

  const canTrain =
    !!versionId && !train.isPending && (taskType === "clustering" || !!target.trim());

  const workflow = useMutation({
    mutationFn: (workflow_type: string) =>
      api.startWorkflow(workspaceId, {
        workflow_type,
        dataset_version_id: versionId || undefined,
        input: { target_column: target || undefined, task_type: taskType },
      }),
    onSuccess: (res) => {
      setPollId(res.job_id);
      setTab("agents");
    },
    onError: (err: Error) => setError(err.message),
  });

  const reportMut = useMutation({
    mutationFn: () =>
      api.createReport(workspaceId, {
        title: "Syntrix analysis report",
        report_type: "executive",
        experiment_id: experimentsQuery.data?.items[0]?.id,
        model_id: modelsQuery.data?.items.find((m) => m.is_champion)?.id,
      }),
    onSuccess: (res) => setPollId(res.job_id),
    onError: (err: Error) => setError(err.message),
  });

  const sendChat = useMutation({
    mutationFn: async () => {
      let id = chatId;
      if (!id) {
        const conv = await api.createConversation(workspaceId);
        id = conv.id;
        setChatId(id);
      }
      const result = await api.sendMessage(id, chatInput);
      return { ...result, conversationId: id };
    },
    onSuccess: async (res) => {
      setChatInput("");
      await qc.invalidateQueries({ queryKey: ["conversation", res.conversationId] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const resumeMut = useMutation({
    mutationFn: (runId: string) =>
      api.resumeWorkflow(runId, {
        target_column: resumeTarget || target || undefined,
        task_type: taskType,
      }),
    onSuccess: async () => {
      setError(null);
      await qc.invalidateQueries({ queryKey: ["agent-runs", workspaceId] });
      await qc.invalidateQueries({ queryKey: ["agent-activities", workspaceId] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const predictMut = useMutation({
    mutationFn: async (modelId: string) => {
      const rows = JSON.parse(predictJson) as Record<string, unknown> | Array<Record<string, unknown>>;
      const payload = Array.isArray(rows) ? rows : [rows];
      return api.predict(modelId, payload);
    },
    onSuccess: (res) => {
      setPredictResult(JSON.stringify(res.output_json, null, 2));
      setError(null);
    },
    onError: (err: Error) => setError(err.message),
  });

  const missingness = useMemo(() => {
    const rows = (edaQuery.data?.eda?.missingness as Array<{ column: string; missing_pct: number }>) || [];
    return rows.slice(0, 12);
  }, [edaQuery.data]);

  const histograms = useMemo(() => {
    const rows =
      (edaQuery.data?.eda?.histograms as Array<{
        column: string;
        bins: Array<{ bin: string; count: number }>;
      }>) || [];
    return rows[0];
  }, [edaQuery.data]);

  if (workspaceQuery.isLoading) {
    return <p className="animate-pulse-soft text-sm text-[var(--color-muted)]">Loading workspace…</p>;
  }
  if (!workspaceQuery.data) {
    return <p className="text-sm text-[var(--color-danger)]">Workspace not found</p>;
  }

  const ws = workspaceQuery.data;
  const tabs: { id: Tab; label: string }[] = [
    { id: "data", label: "Data & EDA" },
    { id: "experiments", label: "Experiments" },
    { id: "agents", label: "Agents" },
    { id: "reports", label: "Reports" },
    { id: "chat", label: "Chat" },
  ];

  return (
    <div className="space-y-6">
      <header className="animate-fade-up">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
          <Link href={`/app/projects/${projectId}`} className="hover:text-[var(--color-accent)]">
            Project
          </Link>{" "}
          / Workspace
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight">
          {ws.name}
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--color-muted)]">
          {ws.description || "Upload data, profile, train, explain, and report — end to end."}
        </p>
      </header>

      {(job || pollId) && (
        <div className="animate-fade-in rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm">
          <span className="text-[var(--color-muted)]">Job</span>{" "}
          <span className="text-[var(--color-accent)]">{job?.status ?? "queued"}</span>
          <span className="mx-2 text-[var(--color-border-strong)]">·</span>
          <span>{job?.progress_pct ?? 0}%</span>
          {job?.job_type ? (
            <>
              <span className="mx-2 text-[var(--color-border-strong)]">·</span>
              <span>{job.job_type}</span>
            </>
          ) : null}
          {job?.error_message ? (
            <p className="mt-1 text-[var(--color-danger)]">{job.error_message}</p>
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              tab === t.id
                ? "bg-white/10 text-[var(--color-foreground)]"
                : "text-[var(--color-muted)] hover:bg-white/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "data" && (
        <section className="animate-fade-up space-y-6">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-5">
            <h2 className="font-[family-name:var(--font-display)] text-lg">Upload dataset</h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              CSV / Parquet / Excel → Supabase Storage → automatic profiling job.
            </p>
            <Input
              className="mt-4"
              type="file"
              accept=".csv,.parquet,.xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) upload.mutate(file);
              }}
              disabled={upload.isPending || !!pollId}
            />
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-5">
            <h2 className="font-[family-name:var(--font-display)] text-lg">Dataset versions</h2>
            <ul className="mt-3 divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)]">
              {(versionsQuery.data?.items ?? []).map((v: DatasetVersion) => (
                <li key={v.id}>
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                      versionId === v.id ? "bg-white/5" : ""
                    }`}
                    onClick={() => setSelectedVersion(v.id)}
                  >
                    <span>
                      {v.label || `v${v.version_number}`}{" "}
                      <span className="text-[var(--color-muted)]">· {v.status}</span>
                    </span>
                    <Link
                      href={`/app/projects/${projectId}/workspaces/${workspaceId}/eda/${v.id}`}
                      className="text-[var(--color-accent)] hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Open EDA
                    </Link>
                  </button>
                </li>
              ))}
              {versionsQuery.data?.items.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-[var(--color-muted)]">
                  No datasets yet — upload a CSV to begin.
                </li>
              ) : null}
            </ul>
          </div>

          {metaQuery.data && (
            <div className="grid gap-4 md:grid-cols-3">
              <Stat label="Rows" value={String(metaQuery.data.row_count ?? "—")} />
              <Stat label="Columns" value={String(metaQuery.data.column_count ?? "—")} />
              <Stat
                label="Missing cells"
                value={`${(metaQuery.data.quality_json as { missing_cell_pct?: number })?.missing_cell_pct ?? 0}%`}
              />
            </div>
          )}

          {histograms && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-5">
              <h3 className="mb-3 text-sm text-[var(--color-muted)]">
                Distribution — {histograms.column}
              </h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={histograms.bins}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="bin" hide />
                    <YAxis stroke="#93a4b8" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        background: "#121821",
                        border: "1px solid #243041",
                        borderRadius: 8,
                      }}
                    />
                    <Bar dataKey="count" fill="#3dd6c6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {missingness.length > 0 && (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-5">
              <h3 className="mb-3 text-sm text-[var(--color-muted)]">Missingness</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={missingness} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                    <XAxis type="number" stroke="#93a4b8" fontSize={11} />
                    <YAxis type="category" dataKey="column" stroke="#93a4b8" fontSize={11} width={70} />
                    <Tooltip
                      contentStyle={{
                        background: "#121821",
                        border: "1px solid #243041",
                        borderRadius: 8,
                      }}
                    />
                    <Bar dataKey="missing_pct" fill="#60a5fa" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {previewQuery.data && (
            <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--color-surface)] text-[var(--color-muted)]">
                  <tr>
                    {previewQuery.data.columns.map((c) => (
                      <th key={c} className="px-3 py-2 font-medium">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewQuery.data.rows.map((row, i) => (
                    <tr key={i} className="border-t border-[var(--color-border)]">
                      {previewQuery.data!.columns.map((c) => (
                        <td key={c} className="px-3 py-1.5 whitespace-nowrap">
                          {row[c] == null ? "—" : String(row[c])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "experiments" && (
        <section className="animate-fade-up space-y-6">
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-5">
            <h2 className="font-[family-name:var(--font-display)] text-lg">Train models</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Target column{taskType === "clustering" ? " (optional)" : ""}</Label>
                <Input
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder={taskType === "clustering" ? "not required" : "e.g. churned"}
                  disabled={taskType === "clustering"}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Task</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 text-sm"
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                >
                  <option value="classification">Classification</option>
                  <option value="regression">Regression</option>
                  <option value="clustering">Clustering</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button disabled={!canTrain} onClick={() => train.mutate()}>
                  {train.isPending ? "Starting…" : "Run AutoML train"}
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-5">
            <h3 className="font-[family-name:var(--font-display)] text-lg">Experiments</h3>
            <ul className="mt-3 divide-y divide-[var(--color-border)]">
              {(experimentsQuery.data?.items ?? []).map((ex) => (
                <li key={ex.id} className="flex justify-between py-2 text-sm">
                  <span>
                    {ex.name}{" "}
                    <span className="text-[var(--color-muted)]">
                      · {ex.task_type} · {ex.status}
                    </span>
                  </span>
                  <span className="text-[var(--color-accent)]">
                    {ex.metrics_json?.best_score != null
                      ? `best ${String(ex.metrics_json.best_score)}`
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-5">
            <h3 className="font-[family-name:var(--font-display)] text-lg">Models</h3>
            <ul className="mt-3 divide-y divide-[var(--color-border)]">
              {(modelsQuery.data?.items ?? []).map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span>
                    {m.algorithm}{" "}
                    {m.is_champion ? (
                      <span className="text-[var(--color-success)]">champion</span>
                    ) : null}
                    <span className="text-[var(--color-muted)]"> · {m.status}</span>
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {!m.is_champion && m.status === "ready" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          api.setChampion(m.id).then(() =>
                            qc.invalidateQueries({ queryKey: ["models", workspaceId] }),
                          )
                        }
                      >
                        Set champion
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={m.status !== "ready" || predictMut.isPending}
                      onClick={() => predictMut.mutate(m.id)}
                    >
                      Predict
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        api
                          .explainModel(m.id)
                          .then((r) => setPollId(r.job_id))
                          .catch((e: Error) => setError(e.message))
                      }
                    >
                      Explain
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        api
                          .getExplanations(m.id)
                          .then((r) => setExplainPreview(JSON.stringify(r.explanations, null, 2)))
                          .catch((e: Error) => setError(e.message))
                      }
                    >
                      View explain
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 space-y-2 border-t border-[var(--color-border)] pt-4">
              <Label>Prediction input (JSON object or array of rows)</Label>
              <textarea
                className="min-h-[88px] w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 font-mono text-xs"
                value={predictJson}
                onChange={(e) => setPredictJson(e.target.value)}
              />
              {predictResult ? (
                <pre className="max-h-48 overflow-auto rounded-md border border-[var(--color-border)] bg-black/20 p-3 text-xs text-[var(--color-accent)]">
                  {predictResult}
                </pre>
              ) : null}
              {explainPreview ? (
                <pre className="max-h-48 overflow-auto rounded-md border border-[var(--color-border)] bg-black/20 p-3 text-xs">
                  {explainPreview}
                </pre>
              ) : null}
            </div>
          </div>
        </section>
      )}

      {tab === "agents" && (
        <section className="animate-fade-up space-y-6">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => workflow.mutate("eda")} disabled={!versionId}>
              Run EDA workflow
            </Button>
            <Button onClick={() => workflow.mutate("automl")} disabled={!versionId}>
              Run AutoML workflow
            </Button>
            <Button onClick={() => workflow.mutate("explain")} variant="secondary">
              Run explain workflow
            </Button>
            <Button onClick={() => workflow.mutate("report")} variant="secondary">
              Run report workflow
            </Button>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-5">
            <h3 className="font-[family-name:var(--font-display)] text-lg">Agent timeline</h3>
            <ul className="mt-3 space-y-2">
              {(activitiesQuery.data?.items ?? []).map((a) => (
                <li
                  key={a.id}
                  className="rounded-md border border-[var(--color-border)] px-3 py-2 text-sm"
                >
                  <span className="text-[var(--color-accent)]">{a.agent_name}</span>
                  <span className="mx-2 text-[var(--color-border-strong)]">·</span>
                  <span>{a.activity_type}</span>
                  <span className="mx-2 text-[var(--color-border-strong)]">·</span>
                  <span className="text-[var(--color-muted)]">{a.status}</span>
                  {a.payload_json?.message ? (
                    <p className="mt-1 text-[var(--color-muted)]">{String(a.payload_json.message)}</p>
                  ) : null}
                </li>
              ))}
              {(activitiesQuery.data?.items.length ?? 0) === 0 ? (
                <li className="text-sm text-[var(--color-muted)]">No agent activity yet.</li>
              ) : null}
            </ul>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-5">
            <h3 className="mb-2 font-[family-name:var(--font-display)] text-lg">Runs</h3>
            <ul className="divide-y divide-[var(--color-border)] text-sm">
              {(runsQuery.data?.items ?? []).map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    {r.workflow_type} · {r.status}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--color-muted)]">{r.id.slice(0, 8)}</span>
                    {r.status === "waiting_human" ? (
                      <div className="flex items-center gap-2">
                        <Input
                          className="h-8 w-36"
                          placeholder="target column"
                          value={resumeTarget}
                          onChange={(e) => setResumeTarget(e.target.value)}
                        />
                        <Button
                          size="sm"
                          disabled={resumeMut.isPending || !(resumeTarget || target)}
                          onClick={() => resumeMut.mutate(r.id)}
                        >
                          Resume HITL
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {tab === "reports" && (
        <section className="animate-fade-up space-y-4">
          <Button onClick={() => reportMut.mutate()} disabled={reportMut.isPending}>
            Generate Markdown + PDF report
          </Button>
          <ul className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)]">
            {(reportsQuery.data?.items ?? []).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span>
                  {r.title} <span className="text-[var(--color-muted)]">· {r.status}</span>
                </span>
                {r.status === "ready" ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        api.downloadReportUrl(r.id, "md").then((d) => window.open(d.url, "_blank"))
                      }
                    >
                      MD
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        api.downloadReportUrl(r.id, "pdf").then((d) => window.open(d.url, "_blank"))
                      }
                    >
                      PDF
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === "chat" && (
        <section className="animate-fade-up space-y-4">
          <div className="min-h-[240px] space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-4">
            {(chatQuery.data?.messages ?? []).map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "ml-auto bg-[var(--color-accent-dim)]/30"
                    : "bg-white/5 text-[var(--color-muted)]"
                }`}
              >
                {m.content}
              </div>
            ))}
            {!chatQuery.data?.messages?.length ? (
              <p className="text-sm text-[var(--color-muted)]">
                Ask about your dataset, models, or report findings.
              </p>
            ) : null}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (chatInput.trim()) sendChat.mutate();
            }}
          >
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="What drives the target column?"
            />
            <Button type="submit" disabled={sendChat.isPending}>
              Send
            </Button>
          </form>
        </section>
      )}

      {error ? <p className="text-sm text-[var(--color-danger)]">{error}</p> : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-4">
      <p className="text-xs uppercase tracking-wider text-[var(--color-muted)]">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl">{value}</p>
    </div>
  );
}
