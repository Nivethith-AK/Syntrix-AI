"use client";

import { useQuery } from "@tanstack/react-query";
import { Database, FolderKanban, Boxes, Bot, FlaskConical, FileText } from "lucide-react";

import { MetricCard } from "@/components/dashboard/metric-card";
import { ActivityChart } from "@/components/dashboard/charts/activity-chart";
import { WorkflowStages } from "@/components/dashboard/charts/workflow-stages";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { QuickStart } from "@/components/dashboard/quick-start";
import { api } from "@/lib/api";

export function OverviewSection({ onNavigateProjects }: { onNavigateProjects?: () => void }) {
  const meQuery = useQuery({ queryKey: ["me"], queryFn: api.me });
  const statsQuery = useQuery({ queryKey: ["me-stats"], queryFn: api.meStats });

  const stats = statsQuery.data;
  const name = meQuery.data?.display_name || meQuery.data?.email?.split("@")[0] || "there";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-gradient-to-br from-accent/10 via-card to-card p-5">
        <p className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
          Welcome back, <span className="text-accent">{name}</span>
        </p>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Autonomous data intelligence — upload data, explore with EDA, train models, explain
          predictions, and ship Markdown/PDF reports with a virtual agent team.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          title="Projects"
          value={statsQuery.isLoading ? "…" : String(stats?.projects ?? 0)}
          change={(stats?.projects ?? 0) > 0 ? "Active" : "Create one"}
          changeType={(stats?.projects ?? 0) > 0 ? "positive" : "neutral"}
          icon={FolderKanban}
          delay={0}
        />
        <MetricCard
          title="Datasets"
          value={statsQuery.isLoading ? "…" : String(stats?.dataset_versions ?? 0)}
          change={`${stats?.datasets ?? 0} files`}
          changeType="neutral"
          icon={Database}
          delay={1}
        />
        <MetricCard
          title="Experiments"
          value={statsQuery.isLoading ? "…" : String(stats?.experiments ?? 0)}
          change="Train runs"
          changeType="neutral"
          icon={FlaskConical}
          delay={2}
        />
        <MetricCard
          title="Models"
          value={statsQuery.isLoading ? "…" : String(stats?.models ?? 0)}
          change="Ready artifacts"
          changeType="neutral"
          icon={Boxes}
          delay={3}
        />
        <MetricCard
          title="Agent runs"
          value={statsQuery.isLoading ? "…" : String(stats?.agent_runs ?? 0)}
          change="Workflows"
          changeType="neutral"
          icon={Bot}
          delay={4}
        />
        <MetricCard
          title="Reports"
          value={statsQuery.isLoading ? "…" : String(stats?.reports ?? 0)}
          change="MD + PDF"
          changeType="neutral"
          icon={FileText}
          delay={5}
        />
      </div>

      {statsQuery.isError ? (
        <p className="text-sm text-destructive">
          Could not load stats. Is the API running?
        </p>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityChart />
        </div>
        <WorkflowStages />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity />
        <QuickStart onGoProjects={onNavigateProjects} />
      </div>
    </div>
  );
}
