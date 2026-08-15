"use client";

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

export type PortfolioStats = {
  projects: number;
  workspaces: number;
  datasets: number;
  dataset_versions: number;
  experiments: number;
  models: number;
  agent_runs: number;
  reports: number;
};

export function ActivityChart({
  stats,
  isLoading,
}: {
  stats?: PortfolioStats | null;
  isLoading?: boolean;
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const data = useMemo(
    () => [
      { name: "Projects", count: stats?.projects ?? 0 },
      { name: "Workspaces", count: stats?.workspaces ?? 0 },
      { name: "Datasets", count: stats?.dataset_versions ?? 0 },
      { name: "Experiments", count: stats?.experiments ?? 0 },
      { name: "Models", count: stats?.models ?? 0 },
      { name: "Agents", count: stats?.agent_runs ?? 0 },
      { name: "Reports", count: stats?.reports ?? 0 },
    ],
    [stats],
  );

  const total = data.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="bg-card border border-border rounded-xl p-5 h-[380px] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-foreground">Portfolio mix</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading
              ? "Loading your counts…"
              : total === 0
                ? "Create a project to start filling this chart"
                : `${total} assets across your Syntrix account`}
          </p>
        </div>
      </div>

      <div
        className={`h-[280px] transition-opacity duration-700 ${isLoaded ? "opacity-100" : "opacity-0"}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={50}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--foreground)",
              }}
            />
            <Bar dataKey="count" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
