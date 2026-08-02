import { redirect } from "next/navigation";

import { BentoGrid } from "@/components/landing/bento-grid";
import { Comparison } from "@/components/landing/comparison";
import { FAQ } from "@/components/landing/faq";
import { FinalCTA } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LogoCloud } from "@/components/landing/logo-cloud";
import { Pricing } from "@/components/landing/pricing";
import { TerminalDemo } from "@/components/landing/terminal-demo";
import { Testimonials } from "@/components/landing/testimonials";
import { getPublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

import "@/styles/landing.css";

export default async function HomePage() {
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        redirect("/app");
      }
    } catch {
      // Stale/invalid session cookies should still show the marketing home.
    }
  }

  return (
    <div className="landing-root min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <LogoCloud />
        <BentoGrid />
        <HowItWorks />
        <TerminalDemo />
        <Testimonials />
        <Comparison />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
