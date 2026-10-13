import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface ScrollRevealProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "up" | "down" | "left" | "right" | "scale" | "fade";
  delay?: number; // Milliseconds to delay start
  duration?: number; // Milliseconds for transition (default: 1000 for slow motion)
  distance?: number; // Distance in pixels to travel
  threshold?: number; // Intersection threshold
  once?: boolean; // Only trigger once
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  variant = "up",
  delay = 0,
  duration = 1000,
  distance = 36,
  threshold = 0.1,
  once = true,
  className,
  style,
  as: Component = "div",
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    // Check if already in viewport on mount
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      // Gentle initial stagger if in viewport
      const timer = setTimeout(() => setIsVisible(true), Math.min(delay, 250));
      return () => clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) {
            observer.unobserve(entry.target);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -40px 0px", // Trigger slightly before it enters full view
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [threshold, once, delay]);

  const getInitialTransform = () => {
    switch (variant) {
      case "up":
        return `translate3d(0, ${distance}px, 0)`;
      case "down":
        return `translate3d(0, -${distance}px, 0)`;
      case "left":
        return `translate3d(-${distance}px, 0, 0)`;
      case "right":
        return `translate3d(${distance}px, 0, 0)`;
      case "scale":
        return `translate3d(0, ${distance * 0.5}px, 0) scale(0.96)`;
      case "fade":
      default:
        return "translate3d(0, 0, 0)";
    }
  };

  const transitionStyle: React.CSSProperties = {
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? "translate3d(0, 0, 0) scale(1)" : getInitialTransform(),
    filter: isVisible ? "blur(0px)" : "blur(1.5px)",
    transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, filter ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
    willChange: "opacity, transform, filter",
    ...style,
  };

  const Comp = Component as any;

  return (
    <Comp
      ref={elementRef}
      style={transitionStyle}
      className={cn("transition-all", className)}
      {...props}
    >
      {children}
    </Comp>
  );
};
