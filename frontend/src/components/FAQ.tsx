import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

interface FAQItem {
  q: string;
  a: string;
}

const faqList: FAQItem[] = [
  {
    q: "What is Syntrix AI and how does it differ from conversational chatbots?",
    a: "Syntrix AI is an autonomous, multi-agent data intelligence platform. Unlike standard chatbots that merely answer questions about data or suggest code snippets, Syntrix AI actually executes work. It coordinates 6 specialized autonomous agents through a LangGraph state machine to perform end-to-end data ingestion, feature engineering, model training, SHAP explainability, and executive reporting.",
  },
  {
    q: "How do the 6 autonomous agents collaborate?",
    a: "Work is coordinated by a Supervisor Agent that delegates to 5 domain-specific subagents: Data Engineering (validation & cleaning), Data Science (EDA & feature transformations), Machine Learning (model training & hyperparameter tuning), Explainability (SHAP & LIME interpretability), and Report (executive synthesis). The agents operate via shared state with evidence-driven self-critique loops.",
  },
  {
    q: "What is the 9-stage machine learning lifecycle?",
    a: "Syntrix AI automates nine discrete stages: 1. Dataset Ingestion, 2. Schema Validation, 3. Automated Cleaning, 4. Feature Engineering, 5. Model Training & Tuning, 6. Metric Evaluation, 7. Explainability & Bias Auditing, 8. Prediction & Risk Scoring, and 9. Executive & Technical Reporting.",
  },
  {
    q: "How does the Model Context Protocol (MCP) layer work?",
    a: "Syntrix AI uses Anthropic's open Model Context Protocol (MCP) to standardize external tool and data access. The File MCP handles CSV, Parquet, JSON, and PDF documents; the Database MCP provides real-time schema inspection and query execution across PostgreSQL, Supabase, and pgvector; and the Research MCP gathers academic literature and external industry signals.",
  },
  {
    q: "Are the ML models explainable or black boxes?",
    a: "Every model trained or analyzed by Syntrix AI includes native SHAP (SHapley Additive exPlanations) and LIME interpretability. The platform generates both global feature importance rankings and local instance attributions, ensuring stakeholders understand precisely why a prediction was made before taking action.",
  },
  {
    q: "How is my enterprise data protected?",
    a: "Security is built into every architectural layer: TLS 1.3 encryption in transit, AES-256 at rest, strict Role-Based Access Control (RBAC), and row-level security policies. Enterprise customers can deploy Syntrix AI inside an air-gapped Virtual Private Cloud (VPC) or on-premise Kubernetes cluster where no data ever leaves your perimeter.",
  },
  {
    q: "Can data scientists intervene or guide the agents?",
    a: "Yes. Syntrix AI embraces human-in-the-loop governance. Data scientists and engineers can inspect agent reasoning traces, review intermediate feature transforms, approve model checkpoints, adjust hyperparameters, or run autonomous pipelines with confidence thresholds that pause for human sign-off on high-risk decisions.",
  },
];

export const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleIndex = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <section id="faq" className="w-full py-20 md:py-28 px-6 md:px-12 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-start gap-16 mb-14">
          {/* Left Column Sticky */}
          <ScrollReveal variant="left" duration={1100} className="space-y-4 max-w-md lg:sticky lg:top-24">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs font-medium text-muted-foreground">
              FAQ
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter text-foreground leading-tight">
              Everything you need to know.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Can't find what you're looking for?{" "}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  window.dispatchEvent(new CustomEvent("open-chat"));
                }}
                className="text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors cursor-pointer bg-transparent border-0 p-0 font-medium inline"
              >
                Talk to our team →
              </button>
            </p>
          </ScrollReveal>

          {/* Right Accordion Column */}
          <div className="flex-1 space-y-3 w-full">
            {faqList.map((item, idx) => {
              const isOpen = openIndex === idx;

              return (
                <ScrollReveal
                  key={item.q}
                  variant="up"
                  delay={idx * 50}
                  duration={850}
                >
                  <div
                    className={cn(
                      "rounded-2xl border transition-all duration-300 overflow-hidden bg-card",
                      isOpen ? "border-foreground shadow-sm" : "border-border hover:border-foreground/30"
                    )}
                  >
                    <button
                      onClick={() => toggleIndex(idx)}
                      className="w-full flex items-center justify-between gap-6 px-6 py-5 text-left cursor-pointer"
                    >
                      <span className="text-base font-semibold leading-snug text-foreground">
                        {item.q}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300",
                          isOpen ? "rotate-180 text-foreground" : ""
                        )}
                      />
                    </button>

                    <div
                      className={cn(
                        "transition-all duration-300 ease-in-out overflow-hidden",
                        isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                      )}
                    >
                      <p className="px-6 pb-6 text-sm text-muted-foreground leading-relaxed">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
