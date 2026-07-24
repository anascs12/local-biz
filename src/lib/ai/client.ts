/**
 * Anthropic client — SPEC §15.2 / §15.4 / §22.1.
 *
 * SERVER ONLY. The API key is read here and here alone; there is no code path
 * in which the browser holds it, and nothing in this module is imported by a
 * client component.
 *
 * Streaming is native (§15.4) and matters for the §25 "AI first token < 3 s"
 * budget: we return tokens as they arrive rather than buffering the reply.
 */

import Anthropic from "@anthropic-ai/sdk";
import { AI_MODEL } from "./config";

export function isConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function createClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  return new Anthropic({ apiKey });
}

export interface StreamOptions {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens: number;
}

/**
 * Stream plain text back to the browser.
 *
 * The returned stream emits raw text chunks (not SSE) — §15.3 specifies
 * "streamed text" for /api/analyst and "streamed Markdown" for /api/report.
 * A mid-stream provider failure closes the stream rather than injecting an
 * error string into the user's answer: a truncated answer is recoverable, but
 * provider error text rendered as analysis would look like a real finding.
 */
export function streamText(options: StreamOptions): ReadableStream<Uint8Array> {
  const client = createClient();
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = client.messages.stream({
          model: AI_MODEL,
          max_tokens: options.maxTokens,
          system: options.system,
          messages: options.messages,
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          // §24 — errors are console.error'd in development only.
          console.error("[ai] stream failed:", error);
        }
        // Close cleanly; the client shows its own retry affordance.
        controller.close();
      }
    },
  });
}
