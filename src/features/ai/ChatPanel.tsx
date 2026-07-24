"use client";

/**
 * ChatPanel — SPEC §9.7.
 * Standard chat column, max-width 760px. Empty state offers 6 suggested
 * question chips (§16.1). Streaming responses; input disabled while streaming;
 * error state offers Retry.
 */

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { MessageBubble } from "./MessageBubble";
import { ContextInspector } from "./ContextInspector";
import { suggestedQuestions } from "@/lib/ai/uiCopy";
import { useAIChat } from "@/hooks/useAIChat";
import { cn } from "@/lib/utils/cn";

function SuggestedQuestions({
  hasCostData,
  onPick,
}: {
  hasCostData: boolean;
  onPick: (q: string) => void;
}) {
  const questions = suggestedQuestions(hasCostData);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-small text-text-400">Try asking:</p>
      <div className="flex flex-wrap gap-2">
        {questions.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onPick(q)}
            className="rounded-full border border-border bg-bg-card px-3 py-1.5 text-small text-text-600 transition-colors hover:border-primary-600/30 hover:bg-primary-50 hover:text-primary-700"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ChatPanel({ hasCostData }: { hasCostData: boolean }) {
  const { messages, sources, aiAvailable, streaming, isStreaming, error, context, send, retry } =
    useAIChat();
  const [input, setInput] = React.useState("");
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, streaming]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
    setInput("");
  };

  const isEmpty = messages.length === 0 && !isStreaming;

  return (
    <div className="mx-auto flex w-full max-w-chat flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-h1 text-text-900">AI Business Analyst</h1>
        <p className="text-small text-text-600">
          Ask about your numbers. Every answer is based only on the figures computed from your
          file.
        </p>
      </div>

      {!aiAvailable && (
        <div
          role="status"
          className="rounded-lg border border-warning/30 bg-[#FFFBEB] px-4 py-3 text-small text-text-600"
        >
          <strong className="font-medium text-text-900">Offline analysis mode.</strong> This
          deployment has no AI API key configured, so answers below are{" "}
          <strong className="font-medium text-text-900">computed directly from your data</strong> in
          the browser rather than written by a language model. They use the same figures the
          dashboard shows. Add an <code>ANTHROPIC_API_KEY</code> to enable the conversational
          analyst.
        </div>
      )}

      {/* Required trust feature (§9.7) */}
      <ContextInspector context={context} />

      {isEmpty ? (
        <div className="flex flex-col gap-6 py-4">
          <SuggestedQuestions hasCostData={hasCostData} onPick={send} />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {messages.map((m, i) => (
            <MessageBubble
              key={i}
              role={m.role}
              content={m.content}
              computed={m.role === "assistant" && sources[i] === "computed"}
            />
          ))}
          {isStreaming && streaming.length > 0 && (
            <MessageBubble role="assistant" content={streaming} streaming />
          )}
          {isStreaming && streaming.length === 0 && (
            <p className="text-small text-text-400" aria-live="polite">
              Reading your figures…
            </p>
          )}
          <div ref={endRef} />
        </div>
      )}

      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="flex flex-wrap items-center gap-3 rounded-lg border border-error/30 bg-[#FEF2F2] px-4 py-3 text-small text-error"
        >
          <span className="flex-1">{error}</span>
          <Button variant="secondary" size="sm" onClick={retry}>
            Retry
          </Button>
        </div>
      )}

      <form onSubmit={submit} className="sticky bottom-16 flex gap-2 bg-bg-app py-2 lg:bottom-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isStreaming}
          placeholder={isStreaming ? "Waiting for the analyst…" : "Ask about your business…"}
          aria-label="Ask a question about your business"
          className={cn(
            "h-11 flex-1 rounded-md border border-border bg-bg-card px-4 text-body text-text-900",
            "placeholder:text-text-400 focus:border-primary-600",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        />
        <Button type="submit" size="lg" disabled={isStreaming || input.trim().length === 0}>
          Ask
        </Button>
      </form>
    </div>
  );
}
