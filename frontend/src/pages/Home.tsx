import React, { useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { HowItWorks } from "@/components/HowItWorks";
import { Integrations } from "@/components/Integrations";
import { Comparison } from "@/components/Comparison";
import { Blog } from "@/components/Blog";
import { Testimonials } from "@/components/Testimonials";
import { Pricing } from "@/components/Pricing";
import { FAQ } from "@/components/FAQ";
import { CTA } from "@/components/CTA";
import { Footer } from "@/components/Footer";
import { ChatWidget } from "@/components/ChatWidget";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ScrollProgressBar } from "@/components/ui/ScrollProgressBar";
import { initSmoothScroll } from "@/lib/scroll";

export const Home: React.FC = () => {
  useEffect(() => {
    const cleanup = initSmoothScroll();
    return () => {
      cleanup();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-primarylw">
      <ScrollProgressBar />
      <Navbar />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <Features />
        <Integrations />
        <Comparison />
        <Blog />
        <Testimonials />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
      <ChatWidget />
      <ScrollToTop />
    </div>
  );
};
