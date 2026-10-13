import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  size?: "sm" | "md" | "lg";
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, defaultChecked, onCheckedChange, size = "md", disabled, ...props }, ref) => {
    const [isChecked, setIsChecked] = React.useState<boolean>(checked ?? defaultChecked ?? false);

    React.useEffect(() => {
      if (checked !== undefined) {
        setIsChecked(checked);
      }
    }, [checked]);

    const handleToggle = () => {
      if (disabled) return;
      const next = !isChecked;
      if (checked === undefined) {
        setIsChecked(next);
      }
      onCheckedChange?.(next);
    };

    const sizeConfig = {
      sm: { track: "h-5 w-9", thumb: "h-3.5 w-3.5", translate: "translate-x-4" },
      md: { track: "h-6 w-11", thumb: "h-5 w-5", translate: "translate-x-5" },
      lg: { track: "h-8 w-14", thumb: "h-7 w-7", translate: "translate-x-6" },
    };

    return (
      <div
        role="switch"
        aria-checked={isChecked}
        onClick={handleToggle}
        className={cn(
          "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          isChecked ? "bg-primary shadow-inner" : "bg-zinc-200 dark:bg-zinc-800",
          sizeConfig[size].track,
          className
        )}
      >
        <input
          type="checkbox"
          ref={ref}
          checked={isChecked}
          onChange={(e) => {
            if (checked === undefined) setIsChecked(e.target.checked);
            onCheckedChange?.(e.target.checked);
          }}
          className="sr-only"
          disabled={disabled}
          {...props}
        />
        <span
          className={cn(
            "pointer-events-none block rounded-full bg-white dark:bg-zinc-100 shadow-md ring-0 transition-transform duration-200 ease-in-out",
            isChecked ? sizeConfig[size].translate : "translate-x-0.5",
            sizeConfig[size].thumb
          )}
        />
      </div>
    );
  }
);
Switch.displayName = "Switch";
