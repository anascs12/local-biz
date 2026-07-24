"use client";

/**
 * MessageBubble — SPEC §9.7 / §22.6.
 *
 * Assistant replies render Markdown so the four-part structure (What happened /
 * Why it matters / Recommended action / Evidence) arrives as bolded subheads.
 *
 * XSS: react-markdown does NOT render raw HTML unless `rehype-raw` is added.
 * It is deliberately not installed — model output is rendered as text and
 * Markdown only, never as HTML (§22.6).
 */

import Markdown from "react-markdown";
import { cn } from "@/lib/utils/cn";

export function MessageBubble({
  role,
  content,
  streaming = false,
}: {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-lg rounded-br-sm bg-primary-600 px-4 py-2.5 text-body text-white">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div
        className={cn(
          "max-w-[95%] rounded-lg rounded-bl-sm border border-border bg-bg-card px-4 py-3",
          "text-body text-text-600",
          // Markdown typography — headings/lists/tables from the model
          "[&_h2]:mt-3 [&_h2]:text-h3 [&_h2]:text-text-900 [&_h3]:mt-3 [&_h3]:text-h3 [&_h3]:text-text-900",
          "[&_strong]:font-medium [&_strong]:text-text-900",
          "[&_p]:my-2 first:[&_p]:mt-0 last:[&_p]:mb-0",
          "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_li]:my-0.5",
          "[&_code]:rounded-sm [&_code]:bg-bg-app [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-small",
          "[&_table]:my-2 [&_table]:w-full [&_th]:border-b [&_th]:border-border [&_th]:text-left",
          "[&_td]:border-b [&_td]:border-border [&_td]:py-1",
        )}
      >
        <Markdown>{content}</Markdown>
        {streaming && (
          <span
            aria-hidden="true"
            className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-primary-600 align-text-bottom"
          />
        )}
      </div>
    </div>
  );
}
