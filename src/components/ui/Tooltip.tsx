"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Tooltip — SPEC §20.5 / §20.7 / §4.1 (G1)
 * Every metric label has a one-sentence definition tooltip. Reveals on hover
 * AND keyboard focus; the trigger is described via aria-describedby.
 * Dependency-free, self-positioned. Dark surface for AA contrast.
 */
export type TooltipSide = "top" | "bottom" | "left" | "right";

const sideClasses: Record<TooltipSide, string> = {
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
  left: "right-full top-1/2 mr-2 -translate-y-1/2",
  right: "left-full top-1/2 ml-2 -translate-y-1/2",
};

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: TooltipSide;
  className?: string;
}

export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();

  // Associate the trigger with the tooltip for assistive tech.
  const trigger = React.cloneElement(children, {
    "aria-describedby": open ? id : undefined,
  });

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
    >
      {trigger}
      <span
        role="tooltip"
        id={id}
        hidden={!open}
        className={cn(
          "absolute z-50 w-max max-w-xs rounded-sm bg-text-900 px-2 py-1",
          "text-caption font-normal leading-snug text-white shadow-popover",
          sideClasses[side],
          className,
        )}
      >
        {content}
      </span>
    </span>
  );
}

/**
 * InfoTooltip — the common "ⓘ next to a metric label" pattern (§9.3 KPI cards).
 */
export function InfoTooltip({
  content,
  label = "More information",
  side = "top",
}: {
  content: React.ReactNode;
  label?: string;
  side?: TooltipSide;
}) {
  return (
    <Tooltip content={content} side={side}>
      <button
        type="button"
        aria-label={label}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-text-400 hover:text-text-600"
      >
        <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.25" />
          <path
            d="M8 7v4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="8" cy="5" r="0.9" fill="currentColor" />
        </svg>
      </button>
    </Tooltip>
  );
}
