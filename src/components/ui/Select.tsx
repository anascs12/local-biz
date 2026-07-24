import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Select — SPEC §20.5 / §9.2
 * A styled native <select>. Native is the deliberate choice: it is accessible
 * by default, mobile-friendly, and is exactly what the column-mapping review
 * screen (§9.2) needs — a dropdown of the file's detected headers.
 * Radius `sm` (6px, inputs). Height 40px.
 */
export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Amber "please confirm" affordance for low-confidence mappings (§11.1). */
  warn?: boolean;
  invalid?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, warn, invalid, children, ...props }, ref) => (
    <div className="relative inline-flex w-full">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "h-10 w-full appearance-none rounded-sm border bg-bg-card py-2 pl-3 pr-9",
          "text-small text-text-900",
          "transition-colors focus:border-primary-600",
          "disabled:cursor-not-allowed disabled:opacity-45",
          invalid
            ? "border-error"
            : warn
              ? "border-warning"
              : "border-border",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {/* chevron */}
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-400"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M6 8l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  ),
);
Select.displayName = "Select";
