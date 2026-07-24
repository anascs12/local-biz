import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Badge — SPEC §20.5
 * Pill, tinted background, 12px medium. One color (tone) per classification.
 * The product-classification chips in §13.6 map to these tones.
 */
export type BadgeTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "violet"
  | "cyan"
  | "pink";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-[#F1F5F9] text-text-600",
  primary: "bg-primary-50 text-primary-700",
  success: "bg-[#ECFDF5] text-success",
  warning: "bg-[#FFFBEB] text-warning",
  error: "bg-[#FEF2F2] text-error",
  violet: "bg-[#F5F3FF] text-[#7C3AED]",
  cyan: "bg-[#ECFEFF] text-[#0891B2]",
  pink: "bg-[#FDF2F8] text-[#DB2777]",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({
  className,
  tone = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-medium",
        "whitespace-nowrap",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
