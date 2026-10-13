import React, { useState } from "react";
import { Zap, Github, Twitter, Linkedin, Youtube, ShieldCheck, X } from "lucide-react";
import { GridBackground } from "@/components/ui/GridBackground";
import { scrollToSection } from "@/lib/scroll";

interface FooterLink {
  label: string;
  href: string;
  badge?: string;
}

const footerLinks: Record<string, FooterLink[]> = {
  Product: [
    { label: "Autonomous Capabilities", href: "features" },
    { label: "9-Stage ML Pipeline", href: "how-it-works" },
    { label: "MCP Live Connectors", href: "integrations" },
    { label: "Capability Matrix", href: "compare" },
    { label: "Pricing Plans", href: "pricing" },
  ],
  Platform: [
    { label: "LangGraph Multi-Agent Engine", href: "features" },
    { label: "SHAP & LIME Interpretability", href: "features" },
    { label: "MLflow Experiment Tracking", href: "integrations" },
    { label: "PostgreSQL & pgvector MCP", href: "integrations" },
    { label: "Air-Gapped VPC Security", href: "faq" },
  ],
  Company: [
    { label: "Founder: Nivethith Arasakumar", href: "hero" },
    { label: "Research & Blog", href: "blog" },
    { label: "Whitepapers", href: "blog" },
    { label: "Documentation", href: "faq" },
    { label: "Enterprise Inquiries", href: "pricing" },
  ],
};

const socialLinks = [
  { icon: Github, href: "https://github.com", label: "GitHub" },
  { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
  { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
  { icon: Youtube, href: "https://youtube.com", label: "YouTube" },
];

export const Footer: React.FC = () => {
  const [legalModalTitle, setLegalModalTitle] = useState<string | null>(null);

  const legalContent: Record<string, string> = {
    "Privacy Policy": "Syntrix AI adheres strictly to enterprise-grade data privacy regulations including GDPR, CCPA, and ISO/IEC 27001. All multi-agent telemetry and vector data remain strictly within your isolated VPC deployment. We never retain customer training data or model weights.",
    "Terms of Service": "By utilizing the Syntrix AI platform, enterprise customers receive guaranteed 99.99% uptime SLA, automated failover routing, end-to-end cryptographic audit logs, and dedicated LangGraph runtime infrastructure.",
    "Security": "SOC 2 Type II certified. Zero-trust network access, end-to-end TLS 1.3 encryption in transit, AES-256 at rest, role-based access control (RBAC), and automated vulnerability assessments across all MCP bridge nodes.",
    "Cookie Preferences": "Syntrix AI utilizes minimal, strictly necessary session cookies for authentication, theme persistence, and LangGraph workflow dashboard telemetry. No third-party ad tracking scripts are loaded.",
  };

  const handleLinkClick = (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    const id = href.replace(/^#/, "");
    if (id) {
      scrollToSection(id, e);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer className="relative w-full border-t border-zinc-200/50 dark:border-white/[0.08] bg-background overflow-hidden">
      <GridBackground className="!absolute inset-0 opacity-20" gridSize={40} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-16 pb-8">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-14">
          {/* Logo & Description */}
          <div className="col-span-2 space-y-6">
            <a
              href="javascript:void(0)"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center border border-border shadow-md">
                <Zap className="w-5 h-5 text-foreground fill-foreground/10" />
              </div>
              <span className="font-bold text-lg tracking-tight text-foreground">
                Syntrix<span className="text-muted-foreground font-normal ml-1">AI</span>
              </span>
            </a>

            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              Autonomous multi-agent data intelligence platform. Transforming raw enterprise data into explainable, production-ready decisions.
            </p>
            <p className="text-xs text-muted-foreground/80 font-medium">
              Architected and engineered by <span className="text-foreground font-semibold">Nivethith Arasakumar</span>.
            </p>

            <div className="flex items-center gap-3">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="h-9 w-9 rounded-full border border-zinc-200/60 dark:border-zinc-800/60 bg-muted/30 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title} className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-foreground">
                {title}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href="javascript:void(0)"
                      onClick={(e) => handleLinkClick(link.href, e)}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      {link.label}
                      {link.badge && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                          {link.badge}
                        </span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-zinc-200/50 dark:border-white/[0.08] text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Syntrix AI, Inc. All rights reserved.</span>
          <div className="flex flex-wrap items-center gap-6">
            {["Privacy Policy", "Terms of Service", "Security", "Cookie Preferences"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setLegalModalTitle(item)}
                className="hover:text-foreground transition-colors cursor-pointer text-xs"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legal & Policy Modal */}
      {legalModalTitle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <h3 className="text-lg font-bold text-foreground">{legalModalTitle}</h3>
              </div>
              <button
                type="button"
                onClick={() => setLegalModalTitle(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {legalContent[legalModalTitle] || "Information updated for enterprise compliance."}
            </p>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setLegalModalTitle(null)}
                className="px-5 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
