/**
 * POST /api/analyst — SPEC §15.2 / §15.3 / §21.4.
 *
 * Body: { context: AIContext, messages: ChatMessage[] } → streamed text.
 *
 * The browser builds the context and never sends raw rows; this route validates
 * that structurally, injects the system prompt, and streams the reply back. The
 * API key exists only in this process (§15.2).
 */

import { ANALYST_SYSTEM_PROMPT, contextMessage } from "@/lib/ai/prompts";
import { analystRequestSchema } from "@/lib/ai/schemas";
import { guardRequest, STREAM_HEADERS, errorResponse } from "@/lib/ai/guards";
import { streamText } from "@/lib/ai/client";
import { MAX_MESSAGES, MAX_TOKENS } from "@/lib/ai/config";
import { AI_ERRORS } from "@/lib/validation/messages";

/**
 * RUNTIME — a forced deviation from §21.4, flagged rather than silent.
 *
 * §21.4 specifies the Edge runtime "for fast cold starts and streaming", and
 * §21.1 specifies `@anthropic-ai/sdk`. These two are incompatible: the SDK's
 * credential chain imports `node:fs` / `node:path` (to resolve local auth
 * profiles), which the Edge bundler cannot resolve — the build fails outright.
 *
 * Keeping the SDK and moving to the Node runtime preserves more of the SPEC's
 * intent than the alternative: streaming still works (the reason Edge was
 * chosen), only cold starts are marginally slower, and we keep the typed
 * client, retries and native stream handling §21.1 selected the SDK for.
 * Dropping the SDK for raw fetch would keep Edge but discard a named choice.
 *
 * The in-memory rate limiter (§22.5) is also better served here: Node instances
 * are longer-lived than Edge isolates, so the counter survives more requests.
 */
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const guard = await guardRequest(request, analystRequestSchema);
  if (!guard.ok) return guard.response;

  const { context, messages } = guard.data;

  try {
    // §15.3 — keep only the last 10 turns. The schema already caps this; the
    // slice makes the guarantee independent of the schema.
    const history = messages.slice(-MAX_MESSAGES);

    // The context rides in the first user turn as data, clearly delimited, so
    // the model treats it as figures to cite rather than instructions.
    const withContext = [
      { role: "user" as const, content: contextMessage(context) },
      { role: "assistant" as const, content: "Understood. I'll answer using only these figures." },
      ...history,
    ];

    const stream = streamText({
      system: ANALYST_SYSTEM_PROMPT,
      messages: withContext,
      maxTokens: MAX_TOKENS.analyst,
    });

    return new Response(stream, { headers: STREAM_HEADERS });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[api/analyst]", error);
    }
    return errorResponse(AI_ERRORS.unavailable, 502);
  }
}
