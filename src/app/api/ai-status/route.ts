/**
 * GET /api/ai-status
 *
 * Tells the browser whether the AI features are usable on this deployment,
 * WITHOUT exposing anything about the credential itself. The response is a
 * single boolean — never the key, never its length, never a masked form.
 *
 * This exists so the UI can offer the offline analysis path up front instead of
 * letting someone type a question and only then discover the feature is
 * unavailable.
 */

import { isConfigured } from "@/lib/ai/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Response {
  return Response.json(
    { enabled: isConfigured() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
