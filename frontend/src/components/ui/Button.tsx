import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "github" | "custom" | "unstyled";
  size?: "default" | "sm" | "lg" | "icon" | "unstyled";
  asChild?: boolean;
}

const variantStyles: Record<string, string> = {
  default: "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 shadow-md font-semibold",
  destructive: "bg-red-600 text-white hover:bg-red-700 shadow-md",
  outline: "border border-zinc-300 dark:border-zinc-700 bg-white/90 dark:bg-zinc-900/90 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-sm font-semibold",
  secondary: "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700",
  ghost: "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100",
  link: "text-zinc-900 dark:text-zinc-100 underline-offset-4 hover:underline",
  github: "bg-zinc-900 text-white dark:bg-zinc-800 dark:text-white border border-zinc-700 hover:bg-zinc-800",
  custom: "btn-3d-custom text-white dark:text-zinc-900 font-semibold border border-white/20",
  unstyled: "",
};

const sizeStyles: Record<string, string> = {
  default: "h-10 px-4 py-2 rounded-lg",
  sm: "h-9 px-3 rounded-md text-xs",
  lg: "h-11 px-8 rounded-xl text-base",
  icon: "h-10 w-10 rounded-lg p-0",
  unstyled: "",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-[0.98]",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
