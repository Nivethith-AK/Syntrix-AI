import React, { useState, useEffect } from "react";
import { Zap, ArrowLeft, Sun, Moon, Github, ArrowRight, Sparkles, CircleCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { GridBackground } from "@/components/ui/GridBackground";
import { cn } from "@/lib/utils";

export const Auth: React.FC = () => {
  const [isSignIn, setIsSignIn] = useState<boolean>(true);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const handleDemoLogin = () => {
    localStorage.setItem(
      "syntrix_session",
      JSON.stringify({
        email: "demo@syntrix.ai",
        user_id: "00000000-0000-0000-0000-000000000001",
        display_name: "Demo Operator",
        role: "operator",
      })
    );
    window.location.href = "/";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    localStorage.setItem(
      "syntrix_session",
      JSON.stringify({
        email: email || "demo@syntrix.ai",
        user_id: "00000000-0000-0000-0000-000000000001",
        display_name: email.split("@")[0] || "Operator",
        role: "operator",
      })
    );
    setTimeout(() => {
      window.location.href = "/";
    }, 600);
  };

  return (
    <div className="min-h-screen flex text-foreground bg-background font-primarylw transition-colors duration-500">
      {/* Left Form Panel */}
      <div className="relative w-full lg:w-1/2 p-8 sm:p-12 lg:p-16 flex items-center justify-center border-r border-border/40 min-h-screen transition-colors duration-500">
        <GridBackground className="!absolute inset-0 opacity-40 pointer-events-none" gridSize={40} />

        {/* Top bar */}
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
          <a
            href="/"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted border border-border/60 transition-colors backdrop-blur-sm shadow-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Home</span>
          </a>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/60 border border-border/60 backdrop-blur-sm shadow-sm">
            <Sun className={cn("h-3.5 w-3.5", !isDark ? "text-foreground" : "text-muted-foreground")} />
            <Switch checked={isDark} onCheckedChange={toggleTheme} size="sm" />
            <Moon className={cn("h-3.5 w-3.5", isDark ? "text-foreground" : "text-muted-foreground")} />
          </div>
        </div>

        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full opacity-10 bg-foreground blur-[120px]" />

        <div className="relative z-10 max-w-sm w-full space-y-8 pt-12 sm:pt-0">
          <div className="text-center space-y-3">
            <div className="flex justify-center mb-2">
              <a href="/" className="group flex items-center gap-2.5 cursor-pointer">
                <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center border border-border shadow-md">
                  <Zap className="w-5 h-5 text-foreground fill-foreground/10" />
                </div>
                <span className="font-bold text-lg tracking-tight text-foreground">
                  Syntrix<span className="text-muted-foreground font-normal ml-1">AI</span>
                </span>
              </a>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {isSignIn ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              {isSignIn
                ? "Sign in to access your autonomous AI data intelligence workspace."
                : "Start delivering explainable data intelligence 10× faster with Syntrix AI."}
            </p>
          </div>

          {/* Social Logins */}
          <div className="space-y-3">
            <Button
              variant="outline"
              type="button"
              onClick={() => alert("Google OAuth login triggered")}
              className="w-full flex items-center justify-center gap-3 h-11 text-xs font-semibold rounded-full border border-zinc-300 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900/90 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-sm"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continue with Google
            </Button>

            <Button
              variant="outline"
              type="button"
              onClick={() => alert("GitHub OAuth login triggered")}
              className="w-full flex items-center justify-center gap-3 h-11 text-xs font-semibold rounded-full border border-zinc-300 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900/90 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-sm"
            >
              <Github className="h-4 w-4 text-zinc-900 dark:text-white" />
              Continue with GitHub
            </Button>

            <Button
              variant="outline"
              type="button"
              onClick={handleDemoLogin}
              className="w-full flex items-center justify-center gap-2 h-11 text-xs font-semibold rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 shadow-sm"
            >
              <Sparkles className="h-4 w-4 text-emerald-500" />
              <span>⚡ Explore as Demo Operator (Instant Access)</span>
            </Button>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex-1 h-px bg-border/60" />
            <span className="font-mono text-[10px] uppercase tracking-wider">or continue with email</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          {/* Email & Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Work Email</label>
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-11 px-3.5 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">Password</label>
                {isSignIn && (
                  <button
                    type="button"
                    onClick={() => alert("Password reset instructions have been dispatched to your email address.")}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-11 px-3.5 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 rounded-full text-xs font-bold gap-2 shadow-lg"
            >
              <span>{isSignIn ? "Sign In to Workspace" : "Create Free Account"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </form>

          <div className="pt-2 text-center text-xs text-muted-foreground">
            {isSignIn ? (
              <span>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setIsSignIn(false)}
                  className="text-foreground font-semibold hover:underline cursor-pointer"
                >
                  Sign Up
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setIsSignIn(true)}
                  className="text-foreground font-semibold hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </span>
            )}
          </div>

          <p className="text-center text-[11px] text-muted-foreground/70 leading-relaxed">
            By continuing, you agree to Syntrix AI's{" "}
            <button
              type="button"
              onClick={() => alert("Terms of Service: By signing in you agree to Syntrix AI's SLA, confidentiality, and VPC data usage agreement.")}
              className="underline underline-offset-2 hover:text-foreground cursor-pointer"
            >
              Terms of Service
            </button>{" "}
            and{" "}
            <button
              type="button"
              onClick={() => alert("Privacy Policy: Syntrix AI never retains customer model weights or raw data. All telemetry remains in your isolated VPC.")}
              className="underline underline-offset-2 hover:text-foreground cursor-pointer"
            >
              Privacy Policy
            </button>
            .
          </p>
        </div>
      </div>

      {/* Right Feature Panel (Desktop only) */}
      <div className="relative hidden lg:flex w-1/2 bg-zinc-950 dark:bg-zinc-100 items-center justify-center p-12 overflow-hidden transition-colors duration-500">
        <GridBackground
          className="!absolute inset-0 opacity-50 dark:opacity-40 dark:invert"
          gridSize={40}
        />
        <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 blur-[140px]" />

        <div className="relative z-10 w-full max-w-xl space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/90 dark:bg-white/90 border border-zinc-800 dark:border-zinc-300 text-zinc-300 dark:text-zinc-800 text-xs font-medium backdrop-blur-md shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-amber-400 dark:text-amber-500" />
            <span>Syntrix AI Multi-Agent Engine v2.4</span>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white dark:text-zinc-900 tracking-tight leading-tight">
              From raw data to intelligent decisions — autonomously.
            </h2>
            <p className="text-zinc-400 dark:text-zinc-600 text-sm leading-relaxed">
              Syntrix AI coordinates 6 specialized agents to inspect schemas, engineer features, train high-accuracy models, and generate explainable intelligence.
            </p>
          </div>

          {/* Code & PR Preview Box */}
          <div className="rounded-2xl border border-zinc-800/90 dark:border-zinc-200/90 bg-zinc-900/90 dark:bg-white/90 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="h-10 bg-zinc-900/80 dark:bg-zinc-100/90 border-b border-zinc-800 dark:border-zinc-200 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-zinc-700 dark:bg-zinc-300" />
                <div className="h-3 w-3 rounded-full bg-zinc-700 dark:bg-zinc-300" />
                <div className="h-3 w-3 rounded-full bg-zinc-700 dark:bg-zinc-300" />
              </div>
              <div className="flex items-center gap-2 px-2.5 py-0.5 rounded border border-emerald-500/20 dark:border-emerald-500/30 text-[11px] text-emerald-400 dark:text-emerald-600 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 dark:bg-emerald-600 animate-pulse" />
                Execution Active
              </div>
            </div>

            <div className="p-5 font-mono text-xs space-y-3 leading-relaxed text-zinc-300 dark:text-zinc-800 bg-zinc-950/80 dark:bg-slate-50">
              <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-500">
                <span>$</span>
                <span className="text-indigo-400 dark:text-indigo-600">syntrix-agent</span>
                <span>execute --goal="Predict enterprise renewal churn"</span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2 text-emerald-400 dark:text-emerald-600 font-medium">
                  <CircleCheck className="h-3.5 w-3.5" />
                  <span>[1/3] Database MCP indexed 48,200 records across 14 tables</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-400 dark:text-emerald-600 font-medium">
                  <CircleCheck className="h-3.5 w-3.5" />
                  <span>[2/3] Trained XGBoost & LightGBM (ROC-AUC: 0.941, 100% passed)</span>
                </div>
                <div className="flex items-center gap-2 text-sky-400 dark:text-sky-600 font-medium">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>[3/3] Generated SHAP explainability synthesis & PDF report</span>
                </div>
              </div>

              <div className="mt-3 p-3 rounded-xl bg-zinc-900/90 dark:bg-white border border-zinc-800 dark:border-zinc-200 text-[11px] text-zinc-300 dark:text-zinc-800 shadow-sm">
                <div className="text-zinc-500 dark:text-zinc-400 mb-1">// Explainability Agent: SHAP Attribution Breakdown</div>
                <div className="text-purple-400 dark:text-purple-600">const churnDrivers = await</div>
                <div className="text-zinc-100 dark:text-zinc-900 font-semibold">shapEngine.explain({"{"}</div>
                <div className="pl-4 text-emerald-400 dark:text-emerald-600">+ top_risk_factor: "month-to-month contract (+0.38 SHAP)",</div>
                <div className="pl-4 text-emerald-400 dark:text-emerald-600">+ confidence_score: 0.941, decision: "Intervention Recommended"</div>
                <div className="text-zinc-100 dark:text-zinc-900">{"}"});</div>
              </div>
            </div>
          </div>

          {/* 3 Metric Pills */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="p-3.5 rounded-xl bg-zinc-900/70 dark:bg-white/80 border border-zinc-800/80 dark:border-zinc-200/80 backdrop-blur-sm space-y-1 shadow-sm">
              <div className="text-lg font-bold text-white dark:text-zinc-900">6 Agents</div>
              <div className="text-[11px] text-zinc-400 dark:text-zinc-600">Autonomous Squad</div>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-900/70 dark:bg-white/80 border border-zinc-800/80 dark:border-zinc-200/80 backdrop-blur-sm space-y-1 shadow-sm">
              <div className="text-lg font-bold text-white dark:text-zinc-900">9 Stages</div>
              <div className="text-[11px] text-zinc-400 dark:text-zinc-600">Automated ML Pipeline</div>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-900/70 dark:bg-white/80 border border-zinc-800/80 dark:border-zinc-200/80 backdrop-blur-sm space-y-1 shadow-sm">
              <div className="text-lg font-bold text-white dark:text-zinc-900">100%</div>
              <div className="text-[11px] text-zinc-400 dark:text-zinc-600">Explainable Decisions</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
