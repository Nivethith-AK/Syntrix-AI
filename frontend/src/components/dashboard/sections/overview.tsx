"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Database,
  FolderKanban,
  LayoutGrid,
  Boxes,
  Bot,
  FlaskConical,
  FileText,
  CheckCircle2,
} from "lucide-react";

import { MetricCard } from "@/components/dashboard/metric-card";
import { ActivityChart } from "@/components/dashboard/charts/activity-chart";
import { WorkflowStages } from "@/components/dashboard/charts/workflow-stages";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { QuickStart } from "@/components/dashboard/quick-start";
import type { Section } from "@/components/dashboard/types";
import { api } from "@/lib/api";

export function OverviewSection({
  onNavigateProjects,
  onNavigate,
}: {
  onNavigateProjects?: () => void;
  onNavigate?: (section: Section) => void;
}) {
  const meQuery = useQuery({ queryKey: ["me"], queryFn: api.me });
  const statsQuery = useQuery({ queryKey: ["me-stats"], queryFn: api.meStats });
  const [verifiedBanner, setVerifiedBanner] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("syntrix_verified_banner") === "1") {
        setVerifiedBanner(true);
        sessionStorage.removeItem("syntrix_verified_banner");
      }
    } catch {
      /* ignore */
    }
  }, []);

  const stats = statsQuery.data;
  const name = meQuery.data?.display_name || meQuery.data?.email?.split("@")[0] || "there";

  const cards: {
    title: string;
    value: string;
    change: string;
    changeType: "positive" | "neutral";
    icon: typeof FolderKanban;
    section: Section;
    delay: number;
  }[] = [
    {
      title: "Projects",
      value: statsQuery.isLoading ? "…" : String(stats?.projects ?? 0),
      change: (stats?.projects ?? 0) > 0 ? "Open projects" : "Create one",
      changeType: (stats?.projects ?? 0) > 0 ? "positive" : "neutral",
      icon: FolderKanban,
      section: "projects",
      delay: 0,
    },
    {
      title: "Workspaces",
      value: statsQuery.isLoading ? "…" : String(stats?.workspaces ?? 0),
      change: "Analysis rooms",
      changeType: "neutral",
      icon: LayoutGrid,
      section: "projects",
      delay: 1,
    },
    {
      title: "Datasets",
      value: statsQuery.isLoading ? "…" : String(stats?.dataset_versions ?? 0),
      change: `${stats?.datasets ?? 0} files`,
      changeType: "neutral",
      icon: Database,
      section: "datasets",
      delay: 2,
    },
    {
      title: "Experiments",
      value: statsQuery.isLoading ? "…" : String(stats?.experiments ?? 0),
      change: "Train runs",
      changeType: "neutral",
      icon: FlaskConical,
      section: "experiments",
      delay: 3,
    },
    {
      title: "Models",
      value: statsQuery.isLoading ? "…" : String(stats?.models ?? 0),
      change: "Ready artifacts",
      changeType: "neutral",
      icon: Boxes,
      section: "models",
      delay: 4,
    },
    {
      title: "Reports",
      value: statsQuery.isLoading ? "…" : String(stats?.reports ?? 0),
      change: `${stats?.agent_runs ?? 0} agent runs`,
      changeType: "neutral",
      icon: FileText,
      section: "reports",
      delay: 5,
    },
  ];

  return (
    <div className="space-y-6">
      {verifiedBanner ? (
        <div className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm animate-in fade-in duration-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-accent shrink-0" />
          <div>
            <p className="font-medium text-foreground">Email verified</p>
            <p className="text-muted-foreground">
              Your account is ready. Create a project to start the Syntrix demo path.
            </p>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-gradient-to-br from-accent/10 via-card to-card p-5">
        <p className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
          Welcome back, <span className="text-accent">{name}</span>
        </p>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Your Syntrix command center — jump into projects, upload datasets, train models, run
          agents, and ship Markdown/PDF reports from one workspace.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate?.("projects") ?? onNavigateProjects?.()}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:opacity-90"
          >
            Go to projects
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.("datasets")}
            className="rounded-lg border border-border bg-secondary/60 px-3 py-1.5 text-xs font-medium hover:bg-secondary"
          >
            Datasets & EDA
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.("agents")}
            className="rounded-lg border border-border bg-secondary/60 px-3 py-1.5 text-xs font-medium hover:bg-secondary"
          >
            <span className="inline-flex items-center gap-1">
              <Bot className="h-3.5 w-3.5" /> Agents
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card) => (
          <button
            key={card.title}
            type="button"
            onClick={() => onNavigate?.(card.section)}
            className="text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-transform hover:-translate-y-0.5"
          >
            <MetricCard
              title={card.title}
              value={card.value}
              change={card.change}
              changeType={card.changeType}
              icon={card.icon}
              delay={card.delay}
            />
          </button>
        ))}
      </div>

      {statsQuery.isError ? (
        <p className="text-sm text-destructive">Could not load stats. Is the API running?</p>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityChart stats={stats} isLoading={statsQuery.isLoading} />
        </div>
        <WorkflowStages stats={stats} isLoading={statsQuery.isLoading} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity />
        <QuickStart onGoProjects={onNavigateProjects} />
      </div>
    </div>
  );
}
