import React, { useState, useEffect, useCallback } from "react";
import { Zap, LayoutDashboard, BookOpen, DollarSign, Sun, Moon, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/utils";
import { scrollToSection } from "@/lib/scroll";

const navItems = [
  { id: "how-it-works", label: "How It Works", icon: Zap },
  { id: "features", label: "Capabilities", icon: LayoutDashboard },
  { id: "integrations", label: "Integrations", icon: BookOpen },
  { id: "pricing", label: "Pricing", icon: DollarSign },
];

export const Navbar: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

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

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          setIsScrolled(scrollY > 20);

          if (scrollY < 150) {
            setActiveSection("");
            ticking = false;
            return;
          }

          const scrollPosition = scrollY + 200;
          for (let i = navItems.length - 1; i >= 0; i--) {
            const item = navItems[i];
            const el = document.getElementById(item.id);
            if (el) {
              const rect = el.getBoundingClientRect();
              const top = rect.top + scrollY;
              if (top <= scrollPosition) {
                setActiveSection(item.id);
                break;
              }
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (window.location.hash) {
      const hashId = window.location.hash.replace("#", "");
      const el = document.getElementById(hashId);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth" });
          setActiveSection(hashId);
        }, 150);
      }
      // Clean hash from URL so URL stays pure without #
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  const handleNavClick = useCallback(
    (id: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      setActiveSection(id);
      setMobileMenuOpen(false);
      scrollToSection(id, e);
    },
    []
  );

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  return (
    <div
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300 border-b",
        isScrolled
          ? "bg-background/80 backdrop-blur-xl border-border/30 dark:border-white/10 shadow-sm"
          : "bg-transparent border-transparent"
      )}
    >
      <header className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between relative">
        {/* Logo */}
        <div className="flex items-center">
          <a
            href="javascript:void(0)"
            onClick={(e) => {
              e.preventDefault();
              setActiveSection("");
              setMobileMenuOpen(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
              window.history.replaceState(null, "", window.location.pathname);
            }}
            aria-label="Syntrix AI - Return to top of page"
            className="group flex items-center gap-2.5 cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center border border-border shadow-md group-hover:border-foreground/40 transition-colors">
              <Zap className="w-5 h-5 text-foreground fill-foreground/10" />
            </div>
            <span className="inline md:hidden lg:inline font-bold text-lg tracking-tight text-foreground">
              Syntrix<span className="text-muted-foreground font-normal ml-1">AI</span>
            </span>
          </a>
        </div>

        {/* Center Desktop Nav */}
        <nav className="hidden md:flex items-center absolute left-1/2 -translate-x-1/2">
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-1.5 transition-all duration-300 border backdrop-blur-sm",
              isScrolled ? "bg-muted/80 border-border/60" : "bg-muted/50 border-border/30"
            )}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={handleNavClick(item.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </a>
              );
            })}
          </div>
        </nav>

        {/* Right Nav: Theme Switch & Auth Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2">
            <Moon className={cn("h-4 w-4 transition-colors", isDark ? "text-foreground" : "text-muted-foreground")} />
            <Switch checked={isDark} onCheckedChange={toggleTheme} size="sm" className="data-[state=checked]:bg-foreground" />
            <Sun className={cn("h-4 w-4 transition-colors", isDark ? "text-muted-foreground" : "text-foreground")} />
          </div>

          <div className="hidden md:flex items-center gap-2">
            <a href="/auth">
              <Button variant="ghost" className="text-sm text-muted-foreground hover:text-foreground h-9 px-4">
                Log in
              </Button>
            </a>
            <a href="/auth">
              <Button className="h-9 px-5 rounded-full text-sm font-semibold">
                Get started
              </Button>
            </a>
          </div>

          {/* Mobile menu hamburger */}
          <button
            className="md:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={handleNavClick(item.id)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </a>
              );
            })}

            <div className="flex items-center justify-between px-4 py-3 mt-2 border-t border-border">
              <span className="text-sm text-muted-foreground">
                {isDark ? "Dark" : "Light"} mode
              </span>
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-muted-foreground" />
                <Switch checked={isDark} onCheckedChange={toggleTheme} size="sm" />
                <Sun className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="flex gap-3 px-4 pb-2 pt-1">
              <a href="/auth" className="flex-1">
                <Button variant="outline" className="w-full rounded-full">
                  Log in
                </Button>
              </a>
              <a href="/auth" className="flex-1">
                <Button className="w-full rounded-full">
                  Get started
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
