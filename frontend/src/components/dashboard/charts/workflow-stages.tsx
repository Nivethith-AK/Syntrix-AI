"use client";

import type { PortfolioStats } from "@/components/dashboard/charts/activity-chart";

const stages = [
  { key: "projects", name: "Project", hint: "Container ready" },
  { key: "datasets", name: "Upload / EDA", hint: "Dataset versions" },
  { key: "experiments", name: "Train", hint: "AutoML runs" },
  { key: "models", name: "Explain", hint: "Model artifacts" },
  { key: "reports", name: "Report", hint: "Markdown / PDF" },
] as const;

function stageDone(stats: PortfolioStats | null | undefined, key: (typeof stages)[number]["key"]) {
  if (!stats) return false;
  switch (key) {
    case "projects":
      return stats.projects > 0;
    case "datasets":
      return stats.dataset_versions > 0 || stats.datasets > 0;
    case "experiments":
      return stats.experiments > 0;
    case "models":
      return stats.models > 0;
    case "reports":
      return stats.reports > 0;
  }
}

export function WorkflowStages({
  stats,
  isLoading,
}: {
  stats?: PortfolioStats | null;
  isLoading?: boolean;
}) {
  const doneCount = stages.filter((s) => stageDone(stats, s.key)).length;
  const pct = Math.round((doneCount / stages.length) * 100);

  return (
    <div className="bg-card border border-border rounded-xl p-5 h-[380px] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-foreground">Demo path progress</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isLoading
            ? "Checking your workspace…"
            : doneCount === 0
              ? "Upload → EDA → Train → Explain → Report"
              : `${doneCount}/${stages.length} stages started · ${pct}%`}
        </p>
      </div>
      <div className="space-y-5">
        {stages.map((stage, i) => {
          const done = stageDone(stats, stage.key);
          return (
            <div
              key={stage.key}
              className="space-y-2 animate-in fade-in slide-in-from-left-2"
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground font-medium">{stage.name}</span>
                <span className="text-muted-foreground text-xs">
                  {done ? "In progress" : stage.hint}
                </span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    done ? "bg-accent w-full" : "bg-muted-foreground/20 w-[12%]"
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
