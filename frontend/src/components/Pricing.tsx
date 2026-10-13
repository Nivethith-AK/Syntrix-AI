import React, { useState } from "react";
import { Check, Code, Zap, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

interface Plan {
  name: string;
  priceMonthly: string;
  priceAnnual: string;
  period: string | null;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  features: string[];
  cta: string;
  variant: "default" | "outline";
  highlighted: boolean;
  badge?: string;
}

const plans: Plan[] = [
  {
    name: "Community",
    priceMonthly: "Free",
    priceAnnual: "Free",
    period: null,
    description: "For solo researchers and data scientists exploring multi-agent experimentation and ML pipelines.",
    icon: Code,
    features: [
      "1 Active seat",
      "Up to 10,000 dataset rows per run",
      "Standard 9-stage ML pipeline",
      "File MCP connector (CSV, Parquet)",
      "SHAP feature importance summaries",
      "Community support & documentation",
    ],
    cta: "Start for free",
    variant: "outline",
    highlighted: false,
  },
  {
    name: "Team Platform",
    priceMonthly: "$49",
    priceAnnual: "$39",
    period: "per seat / month",
    description: "The complete autonomous data intelligence platform for fast-moving data science & analytics teams.",
    icon: Zap,
    features: [
      "Unlimited team seats",
      "Unlimited dataset size & pipeline runs",
      "Full 6-agent autonomous orchestration",
      "Live Database MCP (PostgreSQL, pgvector)",
      "Automated SHAP & LIME explanations",
      "MLflow experiment tracking & registry",
      "Exportable executive synthesis reports",
      "Priority email & Slack support",
    ],
    cta: "Start 14-day free trial",
    variant: "default",
    highlighted: true,
    badge: "Most Popular",
  },
  {
    name: "Enterprise",
    priceMonthly: "Custom",
    priceAnnual: "Custom",
    period: null,
    description: "For regulated industries requiring dedicated VPC deployments, custom agent tools, and strict compliance.",
    icon: Building2,
    features: [
      "Air-gapped VPC or on-premise deployment",
      "Custom agent roles & proprietary MCP tools",
      "Enterprise RBAC & row-level security",
      "TLS 1.3 & AES-256 data encryption",
      "SOC 2 Type II & GDPR compliance",
      "Dedicated ML solutions engineer",
      "24/7 SLA-backed mission-critical support",
    ],
    cta: "Contact sales",
    variant: "outline",
    highlighted: false,
  },
];

export const Pricing: React.FC = () => {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section id="pricing" className="w-full py-20 md:py-28 px-6 md:px-12 bg-background scroll-mt-20">
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Header */}
        <ScrollReveal variant="up" duration={1100} className="text-center space-y-4 max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs font-medium text-muted-foreground">
            Pricing
          </span>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter text-foreground leading-tight">
            Predictable pricing for data intelligence.
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            Choose the plan that fits your data science and analytics team. Scale autonomous agent compute as your data grows.
          </p>

          {/* Billing Switch */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <span className={cn("text-sm font-medium", !isAnnual ? "text-foreground" : "text-muted-foreground")}>
              Monthly
            </span>
            <Switch checked={isAnnual} onCheckedChange={setIsAnnual} size="sm" />
            <span className={cn("text-sm font-medium flex items-center gap-1.5", isAnnual ? "text-foreground" : "text-muted-foreground")}>
              Annual
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                Save 20%
              </span>
            </span>
          </div>
        </ScrollReveal>

        {/* 3 Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan, idx) => {
            const Icon = plan.icon;
            const price = isAnnual ? plan.priceAnnual : plan.priceMonthly;

            return (
              <ScrollReveal
                key={plan.name}
                variant="up"
                delay={idx * 140}
                duration={1100}
                className="h-full flex flex-col"
              >
                <div
                  className={cn(
                    "relative flex flex-col justify-between rounded-3xl p-8 transition-all duration-300 h-full",
                    plan.highlighted
                      ? "bg-card border-2 border-foreground shadow-2xl scale-[1.03] z-10"
                      : "bg-card border border-border hover:border-foreground/30 shadow-md"
                  )}
                >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3.5 py-1 rounded-full bg-foreground text-background text-xs font-bold shadow-md">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-foreground">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-lg font-bold text-foreground">{plan.name}</span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {plan.description}
                  </p>

                  <div className="pt-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold tracking-tight text-foreground">
                        {price}
                      </span>
                      {plan.period && (
                        <span className="text-xs text-muted-foreground">{plan.period}</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-border">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      What's included:
                    </span>
                    <ul className="space-y-2.5">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2.5 text-xs text-foreground/90">
                          <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-8 mt-6">
                  <a href="/auth" className="w-full">
                    <Button
                      variant={plan.variant}
                      className={cn(
                        "w-full rounded-full h-11 font-semibold",
                        plan.highlighted ? "shadow-lg shadow-primary/25" : ""
                      )}
                    >
                      {plan.cta}
                    </Button>
                  </a>
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
