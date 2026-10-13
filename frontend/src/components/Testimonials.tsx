import React from "react";
import { Star } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

interface Testimonial {
  quote: string;
  author: string;
  position: string;
  company: string;
  rating?: number;
}

const row1: Testimonial[] = [
  {
    quote: "Syntrix AI reduced our customer churn modeling cycle from 6 weeks to 3 hours. The SHAP explainability breakdown gave our CRO the exact confidence needed to intervene.",
    author: "Dr. Elena Rostova",
    position: "Head of Data Science",
    company: "FinScale Global",
  },
  {
    quote: "Connecting our PostgreSQL warehouse via Database MCP took literally 2 minutes. The LangGraph supervisor coordinates data prep and training with zero manual glue code.",
    author: "Marcus Vance",
    position: "VP of AI Platforms",
    company: "RetainMetrics",
  },
  {
    quote: "The automated 9-stage pipeline found feature interactions in our transactional data that our senior data scientists spent weeks hunting for.",
    author: "Priya Sundaram",
    position: "Chief Analytics Officer",
    company: "Vanguard Retail",
  },
  {
    quote: "Every model comes with a complete MLflow audit trail and executive synthesis PDF. Our compliance team approved deployment in record time.",
    author: "David Kim",
    position: "Principal ML Architect",
    company: "HealthTech AI",
  },
  {
    quote: "The evidence-driven self-critique loop prevented overfitting on a 2M-row healthcare dataset that standard AutoML missed completely.",
    author: "Dr. Julian Weiss",
    position: "Director of AI Research",
    company: "BioNexus Labs",
  },
];

const row2: Testimonial[] = [
  {
    quote: "It's like having a dedicated squad of 6 specialized data scientists working in parallel 24/7. Our sprint delivery throughput jumped 10x.",
    author: "Samantha Reed",
    position: "Director of Engineering",
    company: "Apex Cloud",
  },
  {
    quote: "The explainability reports bridge the gap between technical ML metrics and C-suite decision-makers seamlessly. No more explaining AUC to the board.",
    author: "Farhan Malik",
    position: "CTO",
    company: "Q-Commerce Group",
  },
  {
    quote: "We deployed Syntrix AI inside our air-gapped VPC. The data never leaves our network, and RBAC keeps sensitive financial records strictly governed.",
    author: "Christian Bauer",
    position: "Head of InfoSec",
    company: "Aethelgard Capital",
  },
  {
    quote: "Instead of asking an LLM to hallucinate SQL, Syntrix AI uses Model Context Protocol to validate schemas and execute deterministic analytical tasks.",
    author: "Sofia Chen",
    position: "Lead Data Engineer",
    company: "DataStream IO",
  },
  {
    quote: "The confidence-aware predictions flagged edge-case anomalies before production scoring. Invaluable safety guardrails for enterprise ML.",
    author: "Amara Okafor",
    position: "Senior ML Engineer",
    company: "LogiMatrix",
  },
];

const TestimonialCard: React.FC<Testimonial> = ({ quote, author, position, company, rating = 5 }) => {
  const avatarUrl = `https://api.dicebear.com/9.x/lorelei/svg?seed=${encodeURIComponent(author)}`;

  return (
    <div className="w-[350px] sm:w-[400px] shrink-0 p-6 rounded-2xl border border-border bg-card shadow-sm hover:border-foreground/30 transition-all space-y-4 select-none">
      <div className="flex items-center gap-1 text-amber-500">
        {Array.from({ length: rating }).map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-amber-500" />
        ))}
      </div>

      <p className="text-sm text-foreground/90 leading-relaxed italic">
        "{quote}"
      </p>

      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <img
          src={avatarUrl}
          alt={`${author}'s avatar`}
          className="h-10 w-10 rounded-full object-cover border border-border bg-muted"
          loading="lazy"
        />
        <div>
          <div className="text-sm font-semibold text-foreground">{author}</div>
          <div className="text-xs text-muted-foreground">
            {position} · {company}
          </div>
        </div>
      </div>
    </div>
  );
};

export const Testimonials: React.FC = () => {
  const repeatedRow1 = [...row1, ...row1, ...row1, ...row1];
  const repeatedRow2 = [...row2, ...row2, ...row2, ...row2];

  return (
    <section className="w-full py-20 md:py-28 bg-background relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-14 relative z-10">
        <ScrollReveal variant="up" duration={1100} className="flex flex-col lg:flex-row items-start justify-between gap-8">
          <div className="space-y-3 max-w-lg">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border text-xs font-medium text-muted-foreground">
              Testimonials
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter text-foreground leading-tight">
              Trusted by data science & ML leaders worldwide.
            </h2>
          </div>
          <p className="max-w-sm text-muted-foreground text-base md:text-lg leading-relaxed">
            See how Syntrix AI transforms how enterprise teams analyze data, train models, and generate explainable intelligence.
          </p>
        </ScrollReveal>
      </div>

      <ScrollReveal variant="fade" delay={150} duration={1200}>
        {/* Row 1: Left scrolling */}
        <div className="overflow-hidden mb-4 py-2">
          <div className="flex w-max animate-marquee gap-4">
            {repeatedRow1.map((item, idx) => (
              <TestimonialCard key={`r1-${idx}`} {...item} />
            ))}
          </div>
        </div>

        {/* Row 2: Right scrolling */}
        <div className="overflow-hidden py-2">
          <div className="flex w-max animate-marquee-reverse gap-4">
            {repeatedRow2.map((item, idx) => (
              <TestimonialCard key={`r2-${idx}`} {...item} />
            ))}
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
};
