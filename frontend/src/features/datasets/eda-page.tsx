"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { api } from "@/lib/api";

export function EdaPage({
  projectId,
  workspaceId,
  versionId,
}: {
  projectId: string;
  workspaceId: string;
  versionId: string;
}) {
  const versionQuery = useQuery({
    queryKey: ["version", versionId],
    queryFn: () => api.getDatasetVersion(versionId),
  });
  const edaQuery = useQuery({
    queryKey: ["eda", versionId],
    queryFn: () => api.getEda(versionId),
    refetchInterval: (q) => {
      const eda = q.state.data?.eda;
      return eda && Object.keys(eda).length > 0 ? false : 2000;
    },
  });
  const previewQuery = useQuery({
    queryKey: ["preview", versionId],
    queryFn: () => api.getDatasetPreview(versionId, 30),
  });

  const eda = edaQuery.data?.eda as {
    insights?: Array<{ severity: string; title: string; detail: string }>;
    histograms?: Array<{ column: string; bins: Array<{ bin: string; count: number }> }>;
    categoricals?: Array<{ column: string; values: Array<{ label: string; count: number }> }>;
    missingness?: Array<{ column: string; missing_pct: number }>;
    column_summaries?: Array<Record<string, unknown>>;
    summary?: Record<string, unknown>;
  };

  return (
    <div className="space-y-6">
      <header className="animate-fade-up">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
          <Link
            href={`/app/projects/${projectId}/workspaces/${workspaceId}`}
            className="hover:text-[var(--color-accent)]"
          >
            Workspace
          </Link>{" "}
          / EDA
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl tracking-tight">
          Interactive EDA
        </h1>
        <p className="mt-2 text-[var(--color-muted)]">
          {versionQuery.data
            ? `${versionQuery.data.label || `v${versionQuery.data.version_number}`} · ${versionQuery.data.status}`
            : "Loading version…"}
        </p>
        {edaQuery.data?.semantic_summary ? (
          <p className="mt-1 text-sm text-[var(--color-accent)]">{edaQuery.data.semantic_summary}</p>
        ) : null}
      </header>

      {!eda || Object.keys(eda).length === 0 ? (
        <p className="animate-pulse-soft text-sm text-[var(--color-muted)]">
          Waiting for profiling / EDA job…
        </p>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            {(eda.insights || []).map((ins, i) => (
              <div
                key={i}
                className="animate-fade-up rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-4"
              >
                <p className="text-xs uppercase tracking-wider text-[var(--color-muted)]">
                  {ins.severity}
                </p>
                <p className="mt-1 font-[family-name:var(--font-display)]">{ins.title}</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">{ins.detail}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {(eda.histograms || []).slice(0, 2).map((h) => (
              <ChartCard key={h.column} title={`Histogram · ${h.column}`} data={h.bins} x="bin" y="count" />
            ))}
            {(eda.categoricals || []).slice(0, 2).map((c) => (
              <ChartCard
                key={c.column}
                title={`Categories · ${c.column}`}
                data={c.values.map((v) => ({ bin: v.label, count: v.count }))}
                x="bin"
                y="count"
              />
            ))}
          </div>

          {(eda.missingness || []).length > 0 ? (
            <ChartCard
              title="Missingness by column"
              data={(eda.missingness || []).slice(0, 15)}
              x="column"
              y="missing_pct"
              vertical
            />
          ) : null}

          {previewQuery.data ? (
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
          ) : null}
        </>
      )}
    </div>
  );
}

function ChartCard({
  title,
  data,
  x,
  y,
  vertical,
}: {
  title: string;
  data: Array<Record<string, string | number>>;
  x: string;
  y: string;
  vertical?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 p-5">
      <h3 className="mb-3 text-sm text-[var(--color-muted)]">{title}</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout={vertical ? "vertical" : "horizontal"} margin={vertical ? { left: 70 } : undefined}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={!vertical} horizontal={!!vertical || true} />
            {vertical ? (
              <>
                <XAxis type="number" stroke="#93a4b8" fontSize={11} />
                <YAxis type="category" dataKey={x} stroke="#93a4b8" fontSize={11} width={65} />
              </>
            ) : (
              <>
                <XAxis dataKey={x} hide />
                <YAxis stroke="#93a4b8" fontSize={11} />
              </>
            )}
            <Tooltip
              contentStyle={{ background: "#121821", border: "1px solid #243041", borderRadius: 8 }}
            />
            <Bar dataKey={y} fill="#3dd6c6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
