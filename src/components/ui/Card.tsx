import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Card — SPEC §20.5
 * White surface, 1px border, `lg` radius (14px), no shadow at rest.
 * Padding 24px desktop / 16px mobile (§20.4).
 */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Apply the standard card padding. Set false for edge-to-edge content (e.g. tables). */
  padded?: boolean;
  /** Lift the card on hover (§20.4 hover elevation). */
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, padded = true, interactive = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border border-border bg-bg-card",
        padded && "p-card-pad-mobile md:p-card-pad",
        interactive && "transition-shadow duration-150 hover:shadow-card-hover",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("mb-4 flex items-start justify-between gap-2", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  // H3 card title — 16px / 600 (§20.3)
  <h3
    ref={ref}
    className={cn("text-h3 text-text-900", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-small text-text-400", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";
