"use client";

/**
 * useAIReport — SPEC §9.8 / §18.
 * Builds the context in the browser (§15.2) and streams the Markdown report
 * back, scoped to the current global filters.
 */

import * as React from "react";
import { buildAIContext } from "@/lib/ai/context";
import type { AIContext } from "@/types/aiContext";
import { AI_ERRORS } from "@/lib/validation/messages";
import { useDatasetContext } from "@/context/DatasetContext";
import { useAnalytics } from "./useAnalytics";
import { useAIStatus } from "./useAIStatus";
import { deterministicReport } from "@/lib/ai/deterministic";

export type ReportStatus = "idle" | "generating" | "done" | "error";

/** How the visible report was produced — the UI must label this honestly. */
export type ReportSource = "ai" | "computed";

export interface UseAIReportResult {
  status: ReportStatus;
  markdown: string;
  error: string | null;
  /** Set when generation completes, for the report header (§9.8). */
  generatedAt: Date | null;
  context: AIContext | null;
  /** "computed" means generated in TypeScript, with no model involved. */
  source: ReportSource;
  aiAvailable: boolean;
  generate: () => void;
}

export function useAIReport(): UseAIReportResult {
  const { dataset, filters } = useDatasetContext();
  const analytics = useAnalytics();
  const aiStatus = useAIStatus();

  const [status, setStatus] = React.useState<ReportStatus>("idle");
  const [markdown, setMarkdown] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = React.useState<Date | null>(null);
  const [source, setSource] = React.useState<ReportSource>("ai");

  const context = React.useMemo(
    () => (dataset && analytics ? buildAIContext(dataset, filters, { analytics }) : null),
    [dataset, filters, analytics],
  );

  const generate = React.useCallback(async () => {
    if (status === "generating") return;
    // Never fail silently — surface why nothing happened.
    if (!context) {
      setError(AI_ERRORS.unavailable);
      setStatus("error");
      return;
    }
    // No key on this deployment → produce the computed report instead of an
    // error. It is grounded in the same analytics and is labelled as computed.
    if (aiStatus === "disabled" && analytics && dataset) {
      setSource("computed");
      setMarkdown(deterministicReport(dataset, analytics, filters));
      setGeneratedAt(new Date());
      setStatus("done");
      return;
    }

    setSource("ai");
    setStatus("generating");
    setError(null);
    setMarkdown("");
    setGeneratedAt(null);

    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context }),
      });

      if (!response.ok || !response.body) {
        // Fall back to the computed report rather than showing a dead end.
        if (analytics && dataset) {
          setSource("computed");
          setMarkdown(deterministicReport(dataset, analytics, filters));
          setGeneratedAt(new Date());
          setStatus("done");
          return;
        }
        const message = (await response.text().catch(() => "")) || AI_ERRORS.unavailable;
        setError(message);
        setStatus("error");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setMarkdown(text);
      }

      if (text.trim().length === 0) {
        setError(AI_ERRORS.unavailable);
        setStatus("error");
        return;
      }
      setGeneratedAt(new Date());
      setStatus("done");
    } catch {
      setError(
        typeof navigator !== "undefined" && navigator.onLine === false
          ? AI_ERRORS.offline
          : AI_ERRORS.unavailable,
      );
      setStatus("error");
    }
  }, [context, status, aiStatus, analytics, dataset, filters]);

  return {
    status,
    markdown,
    error,
    generatedAt,
    context,
    source,
    aiAvailable: aiStatus === "enabled",
    generate,
  };
}
