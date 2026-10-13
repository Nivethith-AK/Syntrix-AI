import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "destructive";
  withDot?: boolean;
  dotColor?: string;
}

export function Badge({
  className,
  variant = "default",
  withDot,
  dotColor = "currentColor",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "badge-3d-default border-transparent",
    secondary: "badge-3d-secondary",
    outline: "badge-3d-outline",
    destructive: "bg-red-500 text-white border-transparent",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium tracking-tight select-none transition-all",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {withDot && (
        <span
          className="h-1.5 w-1.5 rounded-full inline-block"
          style={{ backgroundColor: dotColor }}
        />
      )}
      {children}
    </div>
  );
}
