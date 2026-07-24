"use client";

/**
 * useAIChat — SPEC §9.7 / §15.2.
 *
 * Builds the AIContext in the BROWSER (§15.2) and posts it with the message
 * history. Raw transactions never leave the page — only the computed context.
 */

import * as React from "react";
import { buildAIContext } from "@/lib/ai/context";
import type { AIContext } from "@/types/aiContext";
import type { ChatMessage } from "@/lib/ai/schemas";
import { MAX_MESSAGES } from "@/lib/ai/config";
import { AI_ERRORS } from "@/lib/validation/messages";
import { useDatasetContext } from "@/context/DatasetContext";
import { useAnalytics } from "./useAnalytics";

export interface UseAIChatResult {
  messages: ChatMessage[];
  /** Text streamed so far for the in-flight assistant reply. */
  streaming: string;
  isStreaming: boolean;
  error: string | null;
  /** The exact object sent to the model — powers the context inspector (§9.7). */
  context: AIContext | null;
  send: (question: string) => void;
  retry: () => void;
  clear: () => void;
}

export function useAIChat(): UseAIChatResult {
  const { dataset, filters } = useDatasetContext();
  const analytics = useAnalytics();

  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = React.useState("");
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  const context = React.useMemo(
    () =>
      dataset && analytics ? buildAIContext(dataset, filters, { analytics }) : null,
    [dataset, filters, analytics],
  );

  const run = React.useCallback(
    async (history: ChatMessage[]) => {
      // Never fail silently: a bare `return` here would leave the question
      // sitting in the thread with no answer and no explanation.
      if (!context) {
        setError(AI_ERRORS.unavailable);
        setIsStreaming(false);
        return;
      }
      setError(null);
      setIsStreaming(true);
      setStreaming("");

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/analyst", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ context, messages: history.slice(-MAX_MESSAGES) }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          // The body is already a plain-language sentence (§24).
          const message = (await response.text().catch(() => "")) || AI_ERRORS.unavailable;
          setError(message);
          setIsStreaming(false);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let text = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
          setStreaming(text);
        }

        if (text.trim().length === 0) {
          setError(AI_ERRORS.unavailable);
        } else {
          setMessages((prev) => [...prev, { role: "assistant", content: text }]);
        }
        setStreaming("");
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setError(
          typeof navigator !== "undefined" && navigator.onLine === false
            ? AI_ERRORS.offline
            : AI_ERRORS.unavailable,
        );
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [context],
  );

  const send = React.useCallback(
    (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || isStreaming) return;
      const next: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
      setMessages(next);
      void run(next);
    },
    [messages, isStreaming, run],
  );

  /** Re-send the current history — the last turn is already a user message. */
  const retry = React.useCallback(() => {
    if (isStreaming || messages.length === 0) return;
    void run(messages);
  }, [isStreaming, messages, run]);

  const clear = React.useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setStreaming("");
    setError(null);
  }, []);

  return { messages, streaming, isStreaming, error, context, send, retry, clear };
}
