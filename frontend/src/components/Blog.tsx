import React, { useState } from "react";
import { ArrowRight, X, FileText, CheckCircle2, Download, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

interface BlogPost {
  id: string;
  title: string;
  summary: string;
  label: string;
  author: string;
  published: string;
  url: string;
  image: string;
}

const blogData = {
  tagline: "Research & Engineering",
  heading: "Deep Dives into Autonomous Data Intelligence",
  description:
    "Explore technical whitepapers, architectural deep dives, and production benchmarks on LangGraph multi-agent systems, MCP data connectors, and SHAP explainability.",
  buttonText: "Read Research Papers",
  posts: [
    {
      id: "post-1",
      title: "Beyond the Chatbot: Why Applied Machine Learning Requires Multi-Agent Orchestration",
      summary:
        "Discover how a cyclical state machine of 6 specialized agents outperforms monolithic LLMs in data cleaning, feature engineering, and model validation.",
      label: "Architecture",
      author: "Nivethith Arasakumar",
      published: "12 Oct 2025",
      url: "#",
      image: "/images/blocks-feature01.png",
    },
    {
      id: "post-2",
      title: "The Model Context Protocol (MCP) in Enterprise AI: Connecting Data to Autonomous Agents",
      summary:
        "How standardized MCP servers enable autonomous agents to securely query PostgreSQL, extract live schema metadata, and enforce row-level security.",
      label: "MCP Standards",
      author: "Syntrix Research Team",
      published: "04 Oct 2025",
      url: "#",
      image: "/images/blocks-contact01.png",
    },
    {
      id: "post-3",
      title: "Guaranteeing Trust: Automated SHAP Explanations and Agent Self-Critique in High-Stakes ML",
      summary:
        "Unpacking our automated explainability pipeline: generating global and local feature attributions with evidence-based verification before deployment.",
      label: "Explainability & Trust",
      author: "Nivethith Arasakumar",
      published: "22 Sep 2025",
      url: "#",
      image: "/images/blocks-team01.png",
    },
  ] as BlogPost[],
};

export const Blog: React.FC = () => {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [downloadToast, setDownloadToast] = useState(false);
  return (
    <section id="blog" className="py-20 md:py-28 bg-background px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <ScrollReveal variant="up" duration={1100} className="flex flex-col lg:flex-row items-start justify-between gap-8 mb-14">
          <div className="space-y-4 max-w-lg">
            <Badge variant="secondary" className="rounded-full font-medium">
              {blogData.tagline}
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter text-foreground leading-tight">
              {blogData.heading}
            </h2>
          </div>
          <div className="max-w-md space-y-4">
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
              {blogData.description}
            </p>
            <Button
              onClick={() => setSelectedPost(blogData.posts[0])}
              className="rounded-full gap-2 cursor-pointer"
            >
              <span>{blogData.buttonText}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </ScrollReveal>

        {/* Post Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {blogData.posts.map((post, idx) => (
            <ScrollReveal
              key={post.id}
              variant="up"
              delay={idx * 140}
              duration={1050}
              className={cn("h-full", idx === 0 ? "md:col-span-2 lg:col-span-1" : "")}
            >
              <article
                onClick={() => setSelectedPost(post)}
                className="group relative flex flex-col rounded-3xl border border-border overflow-hidden bg-card hover:border-foreground/30 transition-all duration-300 hover:shadow-xl cursor-pointer select-none h-full"
              >
                <div className="aspect-video overflow-hidden bg-muted">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="h-full w-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-500"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src.indexOf("firebasestorage") === -1) {
                        const fname = post.image.split("/").pop();
                        target.src = `https://firebasestorage.googleapis.com/v0/b/codewithmuhilandb.appspot.com/o/uploads%2F${fname}?alt=media`;
                      }
                    }}
                  />
                </div>

                <div className="flex flex-col flex-1 p-6 space-y-3">
                  <Badge variant="outline" className="w-fit text-xs border-foreground/20">
                    {post.label}
                  </Badge>

                  <h3 className="text-lg font-semibold tracking-tight text-foreground leading-snug group-hover:underline underline-offset-4">
                    {post.title}
                  </h3>

                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                    {post.summary}
                  </p>

                  <div className="flex items-center justify-between pt-4 mt-auto border-t border-border text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-foreground">
                        {post.author.charAt(0)}
                      </div>
                      <span className="font-medium text-foreground">{post.author}</span>
                      <span>·</span>
                      <span>{post.published}</span>
                    </div>
                    <span className="text-foreground group-hover:underline font-semibold flex items-center gap-1">
                      Read →
                    </span>
                  </div>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>

      {/* Research Paper Reader Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-2xl space-y-6 text-foreground">
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div className="space-y-2">
                <Badge variant="secondary" className="text-xs">
                  {selectedPost.label}
                </Badge>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight leading-snug">
                  {selectedPost.title}
                </h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{selectedPost.author}</span>
                  <span>·</span>
                  <span>Published {selectedPost.published}</span>
                  <span>·</span>
                  <span>Peer-Reviewed Architecture</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <div>
                <h4 className="font-bold text-foreground text-xs uppercase tracking-wider mb-1">
                  Executive Abstract
                </h4>
                <p>{selectedPost.summary}</p>
              </div>

              <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-2">
                <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Key Methodological Insights
                </h4>
                <ul className="space-y-1.5 text-xs">
                  <li className="flex items-start gap-2">
                    <span className="text-foreground font-bold">1.</span>
                    <span>State-machine coordination across 6 specialized agents eliminates single-point hallucination.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-foreground font-bold">2.</span>
                    <span>Standardized Model Context Protocol (MCP) prevents SQL injection while granting autonomous schema inspection.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-foreground font-bold">3.</span>
                    <span>SHAP TreeExplainer attributions guarantee compliance with EU AI Act and GDPR article 22.</span>
                  </li>
                </ul>
              </div>

              {downloadToast && (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Whitepaper PDF download initiated for "{selectedPost.title}"
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDownloadToast(true);
                  setTimeout(() => setDownloadToast(false), 4000);
                }}
                className="rounded-full gap-2 cursor-pointer"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              <Button
                size="sm"
                onClick={() => setSelectedPost(null)}
                className="rounded-full px-6 cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
