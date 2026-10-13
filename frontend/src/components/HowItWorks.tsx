import React, { useState, useEffect, useRef } from "react";
import { Database, Brain, FileText, Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

interface Step {
  number: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  detail: string;
  mockup: React.ReactNode;
}

export const HowItWorks: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const sectionRef = useRef<HTMLElement>(null);
  const isInViewRef = useRef<boolean>(true);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        isInViewRef.current = entry.isIntersecting;
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => {
      if (isInViewRef.current) {
        setActiveStep((prev) => (prev + 1) % 3);
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [isHovered]);

  const steps: Step[] = [
    {
      number: "01",
      icon: Database,
      title: "Connect Data & State Goal",
      description:
        "Connect relational databases, files, or vector stores via the Model Context Protocol (MCP). State your business question or objective in natural language — zero manual data prep.",
      detail: "Supports File MCP (CSV, Parquet) and Database MCP (PostgreSQL, pgvector, Snowflake).",
      mockup: (
        <div className="rounded-xl border border-border bg-background p-4 font-mono text-xs space-y-2 text-foreground">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span>Ingesting datasets via MCP…</span>
          </div>
          {[
            "Ingested 1,240,000 customer records",
            "Schema validation & anomaly audit",
            "Automated feature engineering & scaling",
            "Target variable identified: churn_risk",
            "Ready for Supervisor Agent",
          ].map((text, idx) => (
            <div
              key={text}
              className={cn(
                "flex items-center gap-2",
                idx === 4 ? "text-foreground font-semibold" : "text-muted-foreground"
              )}
            >
              {idx < 4 ? (
                <span className="text-muted-foreground font-bold">›</span>
              ) : (
                <Check className="h-3.5 w-3.5 text-green-500" />
              )}
              {text}
            </div>
          ))}
        </div>
      ),
    },
    {
      number: "02",
      icon: Brain,
      title: "Multi-Agent Collaboration",
      description:
        "The Supervisor Agent plans the 9-stage ML lifecycle and coordinates specialized agents: Data Engineering, Data Science, ML Modeling, Explainability, and Research.",
      detail: "Operates in an iterative loop: Plan → Execute → Experiment → Self-Critique.",
      mockup: (
        <div className="rounded-xl border border-border bg-background p-4 font-mono text-xs space-y-3 text-foreground">
          <div className="text-muted-foreground text-[10px] uppercase tracking-widest mb-1">
            Supervisor Objective
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-foreground border border-border font-medium">
            "Identify major churn factors and train an explainable ensemble model"
          </div>
          <div className="pt-1 space-y-1.5">
            {[
              "[1] Data Engineer: Clean missing values & outlier clipping",
              "[2] ML Engineer: Cross-validate XGBoost & CatBoost (AUC: 0.94)",
              "[3] Explainability: Compute SHAP feature attributions",
              "[4] Validation: Adversarial self-critique & evidence audit",
            ].map((task) => (
              <div key={task} className="flex items-center gap-2 text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-foreground/30" />
                {task}
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      number: "03",
      icon: FileText,
      title: "Explainable Decisions & Reports",
      description:
        "Every prediction ships with transparent mathematical rationale, confidence bounds, and stakeholder-ready reports — ready for executive presentation or API deployment.",
      detail: "Full auditability, MLflow registry logging, and SOC 2 / GDPR alignment.",
      mockup: (
        <div className="rounded-xl border border-border bg-background p-4 font-mono text-xs space-y-3 text-foreground">
          <div className="flex items-center gap-2">
            <Brain className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">syntrix-churn-ensemble-v1.0</span>
          </div>
          <div className="space-y-1.5">
            {[
              { label: "Model Accuracy (ROC-AUC)", value: "0.942 (Excellent)" },
              { label: "Explainability Audit", value: "SHAP + LIME (100% ✓)" },
              { label: "Self-Critique Check", value: "Passed (Zero Leakage ✓)" },
              { label: "Executive Synthesis", value: "PDF & REST API Ready" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-foreground font-medium">{value}</span>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-border">
            <div className="px-3 py-1.5 rounded-lg bg-foreground text-background text-center text-[11px] font-semibold cursor-pointer hover:opacity-90 transition-opacity">
              Export Executive Decision Report →
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="w-full py-20 md:py-28 px-6 md:px-12 bg-background scroll-mt-20"
    >
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Section Header */}
        <ScrollReveal variant="up" duration={1100} className="flex flex-col lg:flex-row items-start justify-between gap-8">
          <div className="space-y-4 max-w-lg">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs font-medium text-muted-foreground">
              The Syntrix Approach
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter text-foreground leading-tight">
              From raw data to trusted decisions in three steps.
            </h2>
          </div>
          <p className="max-w-sm text-muted-foreground text-base md:text-lg leading-relaxed">
            Syntrix automates the applied machine learning lifecycle — compressing weeks of manual data engineering and modeling into hours without sacrificing transparency.
          </p>
        </ScrollReveal>

        {/* 3 Step Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = activeStep === idx;

            return (
              <ScrollReveal
                key={step.number}
                variant="up"
                delay={idx * 160}
                duration={1100}
                className="h-full"
              >
                <div
                  onClick={() => setActiveStep(idx)}
                  className={cn(
                    "relative group cursor-pointer rounded-3xl border p-8 flex flex-col gap-6 transition-all duration-500 h-full",
                    isActive
                      ? "border-foreground bg-foreground text-background shadow-2xl scale-[1.02]"
                      : "border-border bg-card hover:border-foreground/30 hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={cn(
                        "text-5xl font-black tracking-tighter leading-none transition-colors",
                        isActive ? "text-background/20" : "text-foreground/10"
                      )}
                    >
                      {step.number}
                    </span>
                    <div
                      className={cn(
                        "p-2.5 rounded-xl transition-colors",
                        isActive ? "bg-background/20" : "bg-muted"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", isActive ? "text-background" : "text-foreground")} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3
                      className={cn(
                        "text-xl font-bold tracking-tight transition-colors",
                        isActive ? "text-background" : "text-foreground"
                      )}
                    >
                      {step.title}
                    </h3>
                    <p
                      className={cn(
                        "text-sm leading-relaxed transition-colors",
                        isActive ? "text-background/70" : "text-muted-foreground"
                      )}
                    >
                      {step.description}
                    </p>
                  </div>

                  {/* Mockup Preview */}
                  <div className={cn("transition-all duration-300", isActive ? "opacity-100" : "opacity-70")}>
                    {step.mockup}
                  </div>

                  <div
                    className={cn(
                      "text-xs font-medium flex items-center gap-1.5 transition-colors mt-auto",
                      isActive ? "text-background/70" : "text-muted-foreground"
                    )}
                  >
                    <Check className={cn("h-3.5 w-3.5", isActive ? "text-background" : "text-green-500")} />
                    {step.detail}
                  </div>

                  {idx < 2 && (
                    <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        {/* Indicator dots */}
        <div className="flex justify-center gap-2 pt-2">
          {[0, 1, 2].map((idx) => (
            <button
              key={idx}
              onClick={() => setActiveStep(idx)}
              className={cn(
                "transition-all duration-300 rounded-full h-2 cursor-pointer",
                activeStep === idx ? "w-8 bg-foreground" : "w-2 bg-border hover:bg-foreground/30"
              )}
              aria-label={`Step ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
