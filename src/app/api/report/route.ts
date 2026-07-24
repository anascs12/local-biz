/**
 * POST /api/report — SPEC §15.3 / §18.
 *
 * Body: { context: AIContext } → streamed Markdown (eight sections, §18).
 * Runs the same guard chain as /api/analyst (§15.3), so the size, shape and
 * rate-limit protections cannot drift apart between routes.
 *
 * Runtime: nodejs, for the same reason documented in /api/analyst — the
 * SPEC-mandated SDK (§21.1) cannot run on the Edge runtime §21.4 asks for.
 */

import { REPORT_SYSTEM_PROMPT, contextMessage } from "@/lib/ai/prompts";
import { reportRequestSchema } from "@/lib/ai/schemas";
import { guardRequest, STREAM_HEADERS, errorResponse } from "@/lib/ai/guards";
import { streamText } from "@/lib/ai/client";
import { MAX_TOKENS } from "@/lib/ai/config";
import { AI_ERRORS } from "@/lib/validation/messages";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const guard = await guardRequest(request, reportRequestSchema);
  if (!guard.ok) return guard.response;

  try {
    const stream = streamText({
      system: REPORT_SYSTEM_PROMPT,
      messages: [
        { role: "user", content: contextMessage(guard.data.context) },
        {
          role: "user",
          content:
            "Write the business performance report now, using exactly the eight sections specified.",
        },
      ],
      maxTokens: MAX_TOKENS.report,
    });

    return new Response(stream, { headers: STREAM_HEADERS });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[api/report]", error);
    }
    return errorResponse(AI_ERRORS.unavailable, 502);
  }
}
