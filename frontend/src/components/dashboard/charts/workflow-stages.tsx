"use client";

const stages = [
  { name: "Upload", pct: 100, color: "bg-chart-1" },
  { name: "Profile / EDA", pct: 86, color: "bg-chart-2" },
  { name: "Train", pct: 64, color: "bg-chart-3" },
  { name: "Explain", pct: 48, color: "bg-chart-5" },
  { name: "Report", pct: 32, color: "bg-accent" },
];

export function WorkflowStages() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 h-[380px] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-foreground">Recommended demo path</h3>
        <p className="text-sm text-muted-foreground mt-0.5">Upload → EDA → Train → Explain → Report</p>
      </div>
      <div className="space-y-5">
        {stages.map((stage, i) => (
          <div key={stage.name} className="space-y-2" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground font-medium">{stage.name}</span>
              <span className="text-muted-foreground font-mono text-xs">{stage.pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full ${stage.color} transition-all duration-700`}
                style={{ width: `${stage.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
