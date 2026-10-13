import React from "react";
import { Zap, Check, Minus, X, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

interface ComparisonRow {
  feature: string;
  ai: "full" | "partial" | "none";
  traditional: "full" | "partial" | "none";
}

const comparisonData: ComparisonRow[] = [
  { feature: "Multi-agent LangGraph orchestration", ai: "full", traditional: "none" },
  { feature: "Autonomous 9-stage ML lifecycle", ai: "full", traditional: "partial" },
  { feature: "Automated feature engineering & selection", ai: "full", traditional: "partial" },
  { feature: "Multi-model training & hyperparameter tuning", ai: "full", traditional: "partial" },
  { feature: "Native SHAP & LIME explainability", ai: "full", traditional: "none" },
  { feature: "Model Context Protocol (MCP) live connectors", ai: "full", traditional: "none" },
  { feature: "Evidence-driven agent self-critique", ai: "full", traditional: "none" },
  { feature: "Confidence-aware scoring & risk guardrails", ai: "full", traditional: "partial" },
  { feature: "MLflow experiment tracking & registry", ai: "full", traditional: "partial" },
  { feature: "Automated executive & technical reporting", ai: "full", traditional: "none" },
  { feature: "Enterprise RBAC & TLS 1.3 / AES-256 security", ai: "full", traditional: "partial" },
  { feature: "VPC, on-premise & air-gapped deployment", ai: "full", traditional: "full" },
];

const StatusIndicator: React.FC<{ status: "full" | "partial" | "none"; isAI?: boolean }> = ({
  status,
  isAI = false,
}) => {
  if (status === "full") {
    return (
      <div
        className={cn(
          "h-6 w-6 rounded-full flex items-center justify-center shadow-xs mx-auto",
          isAI
            ? "bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-extrabold"
            : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
        )}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </div>
    );
  }
  if (status === "partial") {
    return <Minus className="h-4 w-4 text-zinc-400 dark:text-zinc-500 mx-auto" />;
  }
  return <X className="h-4 w-4 text-zinc-300 dark:text-zinc-700 mx-auto" />;
};

export const Comparison: React.FC = () => {
  return (
    <section id="compare" className="w-full py-20 md:py-28 px-6 md:px-12 bg-background transition-colors duration-500 font-primarylw">
      <div className="max-w-5xl mx-auto space-y-14">
        {/* Header */}
        <ScrollReveal variant="up" duration={1100} className="text-center space-y-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs font-semibold text-muted-foreground bg-muted/30 backdrop-blur-sm">
            <Zap className="h-3 w-3 text-foreground" />
            Capabilities & Comparison
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
            Syntrix AI vs. traditional data science.
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Traditional workflows require data scientists to manually glue scripts, notebooks, and post-hoc explanations. Syntrix AI closes the loop autonomously.
          </p>
        </ScrollReveal>

        {/* Table Container */}
        <ScrollReveal variant="scale" delay={150} duration={1100}>
          <div className="rounded-3xl border border-border overflow-hidden shadow-2xl bg-card backdrop-blur-md">
            {/* Header Row */}
            <div className="grid grid-cols-3 border-b border-border">
              <div className="p-5 sm:p-6 flex items-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Capability
              </div>
              <div className="p-5 sm:p-6 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 text-center flex flex-col items-center justify-center border-x border-zinc-800 dark:border-zinc-200 relative">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-3 py-0.5 rounded-full bg-zinc-800 dark:bg-zinc-200 text-zinc-200 dark:text-zinc-800 border border-zinc-700 dark:border-zinc-300 mb-1.5 shadow-sm">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 dark:text-emerald-600" />
                  <span>Recommended</span>
                </div>
                <div className="text-base font-black tracking-tight">Syntrix AI</div>
                <div className="text-[11px] opacity-70 mt-0.5 font-medium">Autonomous Intelligence</div>
              </div>
              <div className="p-5 sm:p-6 bg-muted/30 text-center flex flex-col items-center justify-center">
                <div className="text-base font-bold tracking-tight text-foreground">Traditional Workflow</div>
                <div className="text-xs text-muted-foreground mt-0.5">Manual notebooks & scripts</div>
              </div>
            </div>

            {/* Data Rows */}
            {comparisonData.map((row, idx) => (
              <div
                key={row.feature}
                className={cn(
                  "grid grid-cols-3 border-b border-border/60 last:border-0 transition-colors hover:bg-muted/20 items-center",
                  idx % 2 === 1 ? "bg-muted/10" : ""
                )}
              >
                <div className="p-4 sm:p-5 text-sm font-medium text-foreground">
                  {row.feature}
                </div>
                <div className="p-4 sm:p-5 border-x border-zinc-800/20 dark:border-zinc-200/20 bg-foreground/5 text-center flex items-center justify-center">
                  <StatusIndicator status={row.ai} isAI={true} />
                </div>
                <div className="p-4 sm:p-5 text-center flex items-center justify-center">
                  <StatusIndicator status={row.traditional} isAI={false} />
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
