import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Skeleton — SPEC §20.5
 * Grey (#E2E8F0 / `border` token) blocks with a slow pulse for loading states.
 * No spinners except in buttons.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-skeleton rounded-sm bg-border",
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  );
}
