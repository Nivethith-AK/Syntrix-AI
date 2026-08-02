"use client";

import { ArrowRight, Database, FolderKanban, FlaskConical, Bot } from "lucide-react";

const steps = [
  {
    icon: FolderKanban,
    title: "Create a project",
    description: "Top-level container for your analyses",
  },
  {
    icon: Database,
    title: "Upload a dataset",
    description: "CSV / Parquet → profile + EDA",
  },
  {
    icon: FlaskConical,
    title: "Run AutoML",
    description: "Train, compare, set a champion",
  },
  {
    icon: Bot,
    title: "Launch agents",
    description: "EDA / AutoML workflows with HITL",
  },
];

export function QuickStart({ onGoProjects }: { onGoProjects?: () => void }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Demo path</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            End-to-end Syntrix journey (~15–20 min)
          </p>
        </div>
        {onGoProjects ? (
          <button
            type="button"
            onClick={onGoProjects}
            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            Start <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>
      <ol className="space-y-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  <span className="text-muted-foreground font-mono mr-2">{index + 1}.</span>
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
