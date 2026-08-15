import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { LogoCloud } from "@/components/logo-cloud"
import { BentoGrid } from "@/components/bento-grid"
import { HowItWorks } from "@/components/how-it-works"
import { TerminalDemo } from "@/components/terminal-demo"
import { Pricing } from "@/components/pricing"
import { Testimonials } from "@/components/testimonials"
import { Comparison } from "@/components/comparison"
import { FAQ } from "@/components/faq"
import { FinalCTA } from "@/components/final-cta"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
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
  )
}
