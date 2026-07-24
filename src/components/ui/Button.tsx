import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Button — SPEC §20.5
 * Variants: primary (solid teal) · secondary (white + border) · ghost · danger.
 * Sizes: sm 32px · default 40px · lg 44px.
 * Disabled at 45% opacity with cursor-not-allowed. Radius `md` (10px).
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "default" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary-600 text-white hover:bg-primary-700",
  secondary:
    "bg-bg-card text-text-900 border border-border hover:bg-primary-50 hover:border-primary-600/30",
  ghost: "bg-transparent text-text-900 hover:bg-primary-50",
  danger: "bg-error text-white hover:bg-[#B91C1C]",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-small gap-1.5",
  default: "h-10 px-4 text-small gap-2",
  lg: "h-11 px-5 text-body font-medium gap-2",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Show an in-button spinner and disable interaction. */
  loading?: boolean;
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
      />
    </svg>
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "default",
      loading = false,
      disabled,
      type = "button",
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          "inline-flex select-none items-center justify-center rounded-md font-medium",
          "transition-colors duration-150",
          "disabled:cursor-not-allowed disabled:opacity-45",
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {loading && <Spinner />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
