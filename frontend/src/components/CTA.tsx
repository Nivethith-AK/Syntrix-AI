import React from "react";
import { Zap, ArrowRight, GitBranch } from "lucide-react";
import { GridBackground } from "@/components/ui/GridBackground";
import { scrollToSection } from "@/lib/scroll";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export const CTA: React.FC = () => {
  return (
    <section className="w-full py-20 md:py-28 px-6 md:px-12 bg-background transition-colors duration-500">
      <div className="max-w-7xl mx-auto">
        <ScrollReveal variant="scale" duration={1200}>
          <div className="relative overflow-hidden rounded-3xl bg-zinc-950 dark:bg-zinc-100 border border-zinc-800/80 dark:border-zinc-300 px-8 md:px-16 py-16 md:py-20 shadow-2xl transition-colors duration-500">
          <GridBackground
            className="!absolute inset-0 opacity-25 dark:opacity-20 dark:invert"
            gridSize={40}
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[400px] w-[700px] rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 blur-[100px]" />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center gap-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 dark:bg-zinc-900/10 border border-white/20 dark:border-zinc-900/20 text-white dark:text-zinc-900 text-xs font-semibold backdrop-blur-sm shadow-xs">
              <Zap className="h-3 w-3 text-amber-400 dark:text-amber-500" />
              Deploy in minutes
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter text-white dark:text-zinc-950 leading-[1.05] max-w-3xl text-balance">
              Don't just ask AI about your data. Let AI work on it.
            </h2>

            <p className="text-zinc-400 dark:text-zinc-600 text-base md:text-lg max-w-xl leading-relaxed">
              Empower your organization with autonomous, explainable data intelligence. Connect your data warehouse, trigger the 6-agent workforce, and get board-ready insights.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="/auth"
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white text-sm font-extrabold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-xl"
              >
                Get started for free
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="javascript:void(0)"
                onClick={(e) => scrollToSection("how-it-works", e)}
                className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-full border border-white/20 text-white dark:border-zinc-400/60 dark:text-zinc-900 text-sm font-semibold hover:bg-white/10 dark:hover:bg-zinc-900/10 transition-colors cursor-pointer"
              >
                <GitBranch className="h-4 w-4" />
                Explore architecture
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-zinc-400 dark:text-zinc-600 font-medium">
              <span>No credit card required</span>
              <span>·</span>
              <span>14-day free trial</span>
              <span>·</span>
              <span>SOC 2 & GDPR aligned</span>
              <span>·</span>
              <span>Air-gapped deployment ready</span>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </div>
  </section>
  );
};
