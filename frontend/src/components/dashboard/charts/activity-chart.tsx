"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { week: "W1", jobs: 4, experiments: 1 },
  { week: "W2", jobs: 7, experiments: 2 },
  { week: "W3", jobs: 5, experiments: 3 },
  { week: "W4", jobs: 11, experiments: 4 },
  { week: "W5", jobs: 9, experiments: 3 },
  { week: "W6", jobs: 14, experiments: 6 },
  { week: "W7", jobs: 12, experiments: 5 },
  { week: "W8", jobs: 18, experiments: 8 },
];

export function ActivityChart() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-card border border-border rounded-xl p-5 h-[380px] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-foreground">Demo activity shape</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Illustrative job volume — live jobs appear in each workspace
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-chart-1" />
            <span className="text-muted-foreground">Jobs</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-chart-2" />
            <span className="text-muted-foreground">Experiments</span>
          </div>
        </div>
      </div>

      <div className={`h-[280px] transition-opacity duration-700 ${isLoaded ? "opacity-100" : "opacity-0"}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="jobsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="week" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--foreground)",
              }}
            />
            <Area type="monotone" dataKey="jobs" stroke="var(--chart-1)" fill="url(#jobsGradient)" strokeWidth={2} />
            <Area type="monotone" dataKey="experiments" stroke="var(--chart-2)" fill="url(#expGradient)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
