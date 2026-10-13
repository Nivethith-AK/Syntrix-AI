import React, { useState } from "react";
import { ArrowRight } from "lucide-react";
import { scrollToSection } from "@/lib/scroll";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

interface Integration {
  name: string;
  category: string;
  desc: string;
}

const integrations: Integration[] = [
  { name: "LangGraph", category: "AI & Orchestration", desc: "Multi-agent graph coordination engine with cyclical routing and shared state." },
  { name: "PostgreSQL", category: "Data & Storage", desc: "Enterprise relational database for structured datasets and persistent agent metadata." },
  { name: "pgvector", category: "Data & Storage", desc: "Vector-native semantic search across unstructured documents, research, and embeddings." },
  { name: "MLflow", category: "MLOps", desc: "Automated experiment tracking, hyperparameter logging, and model registry governance." },
  { name: "FastAPI", category: "Backend & API", desc: "High-throughput asynchronous REST and WebSocket runtime for streaming agent execution." },
  { name: "Model Context Protocol", category: "AI & Orchestration", desc: "Standardized MCP connectors for File, Database, and Research tool execution." },
  { name: "Scikit-learn", category: "MLOps", desc: "Core algorithms for automated data cleaning, validation, and baseline modeling." },
  { name: "XGBoost & LightGBM", category: "MLOps", desc: "High-performance gradient boosting for automated tabular intelligence and classification." },
  { name: "SHAP & LIME", category: "MLOps", desc: "Built-in mathematical explainability delivering global and local prediction rationale." },
  { name: "Redis", category: "Data & Storage", desc: "In-memory caching, message queues, and high-velocity agent short-term memory." },
  { name: "Docker", category: "MLOps", desc: "Containerized, isolated execution sandboxes ensuring 100% reproducible environments." },
  { name: "Supabase Storage", category: "Data & Storage", desc: "Secure object storage for raw training datasets, model weights, and executive reports." },
];

const categoryBadgeStyles: Record<string, string> = {
  "AI & Orchestration": "bg-foreground/10 text-foreground border-foreground/20",
  "Data & Storage": "bg-muted text-muted-foreground border-border",
  MLOps: "bg-muted text-muted-foreground border-border",
  "Backend & API": "bg-muted text-muted-foreground border-border",
};

export const Integrations: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = ["All", "AI & Orchestration", "Data & Storage", "MLOps", "Backend & API"];

  const filteredIntegrations = integrations.filter(
    (item) => selectedCategory === "All" || item.category === selectedCategory
  );

  return (
    <section id="integrations" className="w-full py-20 md:py-28 px-6 md:px-12 bg-background scroll-mt-20">
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Section Header */}
        <ScrollReveal variant="up" duration={1100} className="flex flex-col lg:flex-row items-start justify-between gap-8">
          <div className="space-y-4 max-w-lg">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs font-medium text-muted-foreground">
              Technology & MCP Ecosystem
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter text-foreground leading-tight">
              Fits into your data stack. Not the other way around.
            </h2>
          </div>
          <div className="max-w-sm space-y-4">
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
              Syntrix connects directly to your databases, ML pipelines, and enterprise storage via open, standardized protocols.
            </p>
            <a
              href="javascript:void(0)"
              onClick={(e) => scrollToSection("pricing", e)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-foreground border border-border rounded-full px-5 py-2.5 hover:bg-muted transition-colors cursor-pointer"
            >
              View architecture specs →
            </a>
          </div>
        </ScrollReveal>

        {/* Category Filter Pills */}
        <ScrollReveal variant="fade" delay={120} duration={900} className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer",
                selectedCategory === cat
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {cat}
            </button>
          ))}
        </ScrollReveal>

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredIntegrations.map((item, idx) => (
            <ScrollReveal
              key={item.name}
              variant="scale"
              delay={(idx % 4) * 80}
              duration={950}
              className="h-full"
            >
              <div
                className="group flex flex-col gap-4 p-5 rounded-2xl border border-border bg-card hover:border-foreground/30 hover:shadow-lg transition-all duration-200 cursor-pointer select-none h-full"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-muted border border-border flex items-center justify-center text-sm font-black text-foreground tracking-tight shrink-0 shadow-inner">
                    {item.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">{item.name}</div>
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                        categoryBadgeStyles[item.category] || "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {item.category}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed flex-1">
                  {item.desc}
                </p>

                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-foreground/50 group-hover:text-foreground transition-colors pt-2 border-t border-border/40">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Integrated
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Custom Integration Callout */}
        <ScrollReveal variant="up" delay={200} duration={1100}>
          <div className="rounded-3xl border border-border bg-muted/30 px-8 md:px-12 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <h3 className="text-xl font-bold text-foreground">Need custom data connectors?</h3>
              <p className="text-sm text-muted-foreground">
                Our Model Context Protocol (MCP) framework lets you connect proprietary databases, cloud buckets, and research feeds in minutes.
              </p>
            </div>
            <a
              href="javascript:void(0)"
              onClick={(e) => scrollToSection("faq", e)}
              className="shrink-0 px-6 py-3 border border-border rounded-full text-sm font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Read MCP Architecture →
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
