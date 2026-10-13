import Lenis from "lenis";

let lenisInstance: Lenis | null = null;
let rafId: number | null = null;

export const initSmoothScroll = (): (() => void) => {
  if (typeof window === "undefined") return () => {};

  if (lenisInstance) {
    lenisInstance.destroy();
    lenisInstance = null;
  }
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  // Create Lenis with slow-motion luxurious easing curve
  lenisInstance = new Lenis({
    duration: 1.5, // Slow-motion glide duration
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Smooth deceleration
    orientation: "vertical",
    gestureOrientation: "vertical",
    smoothWheel: true,
    wheelMultiplier: 0.95, // Deliberate smooth wheel feel
    touchMultiplier: 1.2,
    infinite: false,
  });

  function raf(time: number) {
    if (lenisInstance) {
      lenisInstance.raf(time);
      rafId = requestAnimationFrame(raf);
    }
  }
  rafId = requestAnimationFrame(raf);

  return () => {
    if (rafId) cancelAnimationFrame(rafId);
    if (lenisInstance) {
      lenisInstance.destroy();
      lenisInstance = null;
    }
  };
};

export const getLenis = (): Lenis | null => lenisInstance;

export const scrollToSection = (id: string, e?: React.MouseEvent) => {
  if (e) {
    e.preventDefault();
  }
  const el = document.getElementById(id);
  if (el) {
    if (lenisInstance) {
      lenisInstance.scrollTo(el, {
        duration: 1.8, // Slow-motion arrival
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        offset: -80,
      });
    } else {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }
  if (typeof window !== "undefined") {
    // Keep URL clean without #
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
};

export const clearHashFromUrl = () => {
  if (typeof window !== "undefined" && window.location.hash) {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
};
