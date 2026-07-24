"use client";

/**
 * useAIStatus — is the AI configured on this deployment?
 *
 * Lets the UI offer the offline (computed) path up front, instead of letting
 * someone type a question and only then discover the feature is unavailable.
 * Fails closed: if the check itself fails, we assume AI is unavailable and use
 * the deterministic path, which always works.
 */

import * as React from "react";

export type AIAvailability = "checking" | "enabled" | "disabled";

export function useAIStatus(): AIAvailability {
  const [status, setStatus] = React.useState<AIAvailability>("checking");

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/ai-status")
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((d: { enabled?: boolean }) => {
        if (!cancelled) setStatus(d.enabled ? "enabled" : "disabled");
      })
      .catch(() => {
        if (!cancelled) setStatus("disabled");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
