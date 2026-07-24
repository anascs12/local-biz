import * as React from "react";
import { cn } from "@/lib/utils/cn";

/**
 * EmptyState — SPEC §20.5
 * Centered icon, headline, one line of explanation, one primary action.
 * Used by the RequireDataset guard (§8) and empty filter results (§24).
 */
export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** A single primary action (typically a Button), rendered below the copy. */
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-16 text-center",
        className,
      )}
      {...props}
    >
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          {icon}
        </div>
      )}
      <h3 className="text-h3 text-text-900">{title}</h3>
      {description && (
        <p className="max-w-sm text-body text-text-600">{description}</p>
      )}
      {action && <div className="mt-2 flex items-center gap-3">{action}</div>}
    </div>
  );
}
