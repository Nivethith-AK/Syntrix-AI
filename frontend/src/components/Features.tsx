import React, { useState } from "react";
import { Brain, Layers, ShieldCheck, Database, FileCheck, Shield, ChevronDown, ArrowRight } from "lucide-react";
import { scrollToSection } from "@/lib/scroll";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

interface Feature {
  title: string;
  description: string;
  expandedDescription: string;
  icon: React.ComponentType<{ className?: string }>;
  tag: string;
}

const features: Feature[] = [
  {
    title: "Multi-Agent Orchestration",
    description: "A central supervisor agent autonomously plans, delegates, and coordinates specialized agents in real time.",
    expandedDescription: "Where traditional workflows require manual handoffs between data engineers, data scientists, and analysts, Syntrix's supervisor coordinates autonomous agents through LangGraph with shared state and memory.",
    icon: Brain,
    tag: "Supervisor Core",
  },
  {
    title: "Automated 9-Stage ML Pipeline",
    description: "End-to-end automation from raw dataset ingestion and validation to feature engineering, training, and prediction.",
    expandedDescription: "Covers data profiling, anomaly detection, automated cleaning, feature synthesis, cross-validated model selection (Scikit-learn, XGBoost, LightGBM, CatBoost), and automated hyperparameter optimization tracked with MLflow.",
    icon: Layers,
    tag: "9-Stage Engine",
  },
  {
    title: "Explainability Built-In",
    description: "Every model and prediction ships with SHAP-grade and LIME feature attribution, automatically generated.",
    expandedDescription: "No more black-box models. Stakeholders and regulators receive mathematical proof of why predictions were made, ensuring full auditability and compliance in regulated sectors.",
    icon: ShieldCheck,
    tag: "Interpretability",
  },
  {
    title: "Model Context Protocol (MCP)",
    description: "Standardized tool connectivity across local files, SQL databases, vector stores, and external research.",
    expandedDescription: "Leverages the Model Context Protocol (MCP) to plug into File MCP (CSV, Parquet), Database MCP (PostgreSQL, pgvector, Snowflake), and Research MCP (external literature and web signals).",
    icon: Database,
    tag: "Protocol Layer",
  },
  {
    title: "Evidence-Driven Self-Critique",
    description: "Validation agents challenge and stress-test analytical results before they become final recommendations.",
    expandedDescription: "Unlike one-shot LLM chatbots, Syntrix operates in an iterative intelligence loop: User Objective → Plan → Execute → Experiment → Results → Self-Critique → Evidence Check → Insight.",
    icon: FileCheck,
    tag: "Intelligence Loop",
  },
  {
    title: "Executive Reporting & Enterprise Trust",
    description: "Findings compile automatically into stakeholder-ready reports with role-based access, encryption, and audit trails.",
    expandedDescription: "Produces concise executive summaries, risk assessments, and decision trade-offs with TLS 1.3 in transit, AES-256 at rest, row-level security, and architecture aligned to SOC 2 and GDPR standards.",
    icon: Shield,
    tag: "Enterprise Trust",
  },
];

export const Features: React.FC = () => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section id="features" className="w-full py-20 md:py-28 px-6 md:px-12 bg-background scroll-mt-20">
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Section Header */}
        <ScrollReveal variant="up" duration={1100} className="flex flex-col lg:flex-row items-start justify-between gap-8">
          <div className="max-w-xl space-y-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs font-medium text-muted-foreground">
              Core Capabilities
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter text-foreground leading-tight">
              An autonomous data intelligence platform for your enterprise.
            </h2>
          </div>

          <div className="max-w-md space-y-4">
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
              Don’t just ask AI about your data. Let a coordinated fleet of specialized AI agents work on it end-to-end.
            </p>
            <a
              href="javascript:void(0)"
              onClick={(e) => scrollToSection("pricing", e)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:text-muted-foreground transition-colors group cursor-pointer"
            >
              View platform features
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </ScrollReveal>

        {/* 6 Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            const isExpanded = expandedIndex === idx;

            return (
              <ScrollReveal
                key={feature.title}
                variant="up"
                delay={idx * 90}
                duration={1000}
                className="h-full"
              >
                <div
                  onClick={() => toggleExpand(idx)}
                  className={cn(
                    "group relative p-6 rounded-2xl border cursor-pointer transition-all duration-300 select-none h-full",
                    isExpanded
                      ? "border-foreground bg-foreground text-background shadow-xl scale-[1.01]"
                      : "border-border bg-card hover:border-foreground/30 hover:bg-muted/30 hover:shadow-md"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full mb-5 transition-colors",
                      isExpanded ? "bg-background/20 text-background" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {feature.tag}
                  </span>

                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div
                      className={cn(
                        "p-2.5 rounded-xl transition-colors",
                        isExpanded ? "bg-background/20" : "bg-muted"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", isExpanded ? "text-background" : "text-foreground")} />
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 mt-0.5 shrink-0 transition-transform duration-300",
                        isExpanded ? "rotate-180 text-background" : "text-muted-foreground"
                      )}
                    />
                  </div>

                  <h3
                    className={cn(
                      "text-lg font-semibold tracking-tight mb-2 transition-colors",
                      isExpanded ? "text-background" : "text-foreground"
                    )}
                  >
                    {feature.title}
                  </h3>

                  <p
                    className={cn(
                      "text-sm leading-relaxed transition-colors",
                      isExpanded ? "text-background/80" : "text-muted-foreground"
                    )}
                  >
                    {isExpanded ? feature.expandedDescription : feature.description}
                  </p>

                  <div
                    className={cn(
                      "text-[11px] font-medium mt-4 pt-3 border-t transition-colors",
                      isExpanded
                        ? "border-background/20 text-background/70"
                        : "border-border/50 text-muted-foreground group-hover:text-foreground"
                    )}
                  >
                    {isExpanded ? "Click to collapse" : "Click to expand details →"}
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};
