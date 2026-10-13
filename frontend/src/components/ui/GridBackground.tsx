import React, { useEffect, useRef, useState } from "react";

interface GridBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  gridSize?: number;
  gridColor?: string;
  darkGridColor?: string;
  effectColor?: string;
  darkEffectColor?: string;
  trailLength?: number;
  width?: number | string;
  height?: number | string;
  idleSpeed?: number;
  glow?: boolean;
  glowRadius?: number;
  showFade?: boolean;
  fadeIntensity?: number;
  idleRandomCount?: number;
  className?: string;
  children?: React.ReactNode;
}

export const GridBackground: React.FC<GridBackgroundProps> = ({
  gridSize = 40,
  gridColor = "rgba(0, 0, 0, 0.07)",
  darkGridColor = "rgba(255, 255, 255, 0.08)",
  effectColor = "rgba(0, 0, 0, 0.4)",
  darkEffectColor = "rgba(255, 255, 255, 0.4)",
  trailLength = 3,
  width,
  height,
  idleSpeed = 0.2,
  glow = true,
  glowRadius = 15,
  children,
  showFade = true,
  fadeIntensity = 20,
  idleRandomCount = 4,
  className = "",
  ...props
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDark, setIsDark] = useState<boolean>(false);
  const activeGridColor = isDark ? darkGridColor : gridColor;

  const trailRef = useRef<{ x: number; y: number }[]>([]);
  const targetsRef = useRef<{ x: number; y: number }[]>([]);
  const wanderingRef = useRef<{ x: number; y: number }[]>([]);
  const isInteractingRef = useRef<boolean>(false);
  const lastActiveRef = useRef<number>(Date.now());
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const updateDark = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    updateDark();
    const observer = new MutationObserver(() => updateDark());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let bounds: DOMRect | null = null;
    const container = containerRef.current;
    if (!container) return;

    const updateBounds = () => {
      if (container) bounds = container.getBoundingClientRect();
    };
    updateBounds();
    window.addEventListener("resize", updateBounds);

    const handleMouseMove = (e: MouseEvent) => {
      if (!bounds) bounds = container.getBoundingClientRect();
      const x = e.clientX - bounds.left;
      const y = e.clientY - bounds.top;
      if (x < 0 || y < 0 || x > bounds.width || y > bounds.height) return;

      isInteractingRef.current = true;
      lastActiveRef.current = Date.now();
      const cellX = Math.floor(x / gridSize);
      const cellY = Math.floor(y / gridSize);
      const head = trailRef.current[0];
      if (!head || head.x !== cellX || head.y !== cellY) {
        trailRef.current.unshift({ x: cellX, y: cellY });
        if (trailRef.current.length > trailLength) {
          trailRef.current.pop();
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("resize", updateBounds);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [gridSize, trailLength]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isVisible = true;

    const resizeCanvas = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      canvas.width = w;
      canvas.height = h;

      const cols = Math.floor(w / gridSize);
      const rows = Math.floor(h / gridSize);
      targetsRef.current = Array.from({ length: idleRandomCount }, () => ({
        x: Math.floor(Math.random() * cols),
        y: Math.floor(Math.random() * rows),
      }));
      wanderingRef.current = targetsRef.current.map((pt) => ({ ...pt }));
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const activeEffectColor = isDark ? darkEffectColor : effectColor;

    const render = () => {
      if (!isVisible) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (Date.now() - lastActiveRef.current > 2000) {
        isInteractingRef.current = false;
        const cols = Math.floor(w / gridSize);
        const rows = Math.floor(h / gridSize);

        wanderingRef.current.forEach((current, i) => {
          const target = targetsRef.current[i];
          if (!target) return;
          const dx = target.x - current.x;
          const dy = target.y - current.y;

          if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) {
            targetsRef.current[i] = {
              x: Math.floor(Math.random() * cols),
              y: Math.floor(Math.random() * rows),
            };
          } else {
            current.x += dx * idleSpeed;
            current.y += dy * idleSpeed;
          }

          const rx = Math.round(current.x);
          const ry = Math.round(current.y);
          const head = trailRef.current[0];
          if (!head || head.x !== rx || head.y !== ry) {
            trailRef.current.unshift({ x: rx, y: ry });
            if (trailRef.current.length > trailLength * idleRandomCount) {
              trailRef.current.pop();
            }
          }
        });
      }

      trailRef.current.forEach((pt, idx) => {
        const factor = 1 - idx * (1 / (trailLength + 1));
        const color = activeEffectColor.replace(/[\d.]+\)$/g, `${Math.max(0, factor * 0.45)})`);
        ctx.fillStyle = color;
        if (glow) {
          ctx.shadowColor = color;
          ctx.shadowBlur = Math.min(glowRadius, 8);
        } else {
          ctx.shadowBlur = 0;
        }
        ctx.fillRect(pt.x * gridSize, pt.y * gridSize, gridSize, gridSize);
      });

      rafRef.current = requestAnimationFrame(render);
    };

    render();

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) {
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(render);
        } else {
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    return () => {
      observer.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [gridSize, effectColor, darkEffectColor, isDark, glow, glowRadius, idleSpeed, trailLength, idleRandomCount]);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none select-none overflow-hidden ${className}`}
      {...props}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `linear-gradient(to right, ${activeGridColor} 1px, transparent 1px), linear-gradient(to bottom, ${activeGridColor} 1px, transparent 1px)`,
          backgroundSize: `${gridSize}px ${gridSize}px`,
        }}
      />
      {showFade && (
        <div
          className="absolute inset-0 bg-white/40 dark:bg-black/40"
          style={{
            maskImage: `radial-gradient(ellipse at center, transparent ${fadeIntensity}%, black 85%)`,
            WebkitMaskImage: `radial-gradient(ellipse at center, transparent ${fadeIntensity}%, black 85%)`,
          }}
        />
      )}
      {children && <div className="relative z-10 w-full h-full">{children}</div>}
    </div>
  );
};
