/**
 * Shared route guards — SPEC §15.3 / §21.4 / §22.3.
 *
 * "Server-side guards on every route: context payload ≤ 32 KB (reject
 * otherwise), message history capped at the last 10 turns, max_tokens capped,
 * 20 requests per IP per hour via an in-memory LRU. Non-2xx responses return a
 * plain-language error string, never a provider error body."
 *
 * All three AI routes run this same chain, so a guard can't be forgotten on one
 * of them. Order: size → shape → rate limit. Size is checked first because it
 * is the cheapest rejection and bounds the work done on a hostile body; the
 * rate-limit counter is spent last so a malformed request doesn't consume a
 * caller's hourly quota.
 */

import type { z } from "zod";
import { MAX_CONTEXT_BYTES, RATE_LIMIT } from "./config";
import { AI_ERRORS } from "@/lib/validation/messages";
import { clientIp, rateLimit } from "@/lib/utils/rateLimit";
import { isConfigured } from "./client";

/** Plain-text error response — never a provider body, never a stack trace. */
export function errorResponse(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export type GuardResult<T> = { ok: true; data: T } | { ok: false; response: Response };

export async function guardRequest<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<GuardResult<T>> {
  // 0. Refuse early if the deployment has no key, rather than failing later.
  if (!isConfigured()) {
    return { ok: false, response: errorResponse(AI_ERRORS.notConfigured, 503) };
  }

  // 1. Size — §15.3 reject payloads over 32 KB.
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return { ok: false, response: errorResponse(AI_ERRORS.badRequest, 400) };
  }
  if (raw.length === 0) {
    return { ok: false, response: errorResponse(AI_ERRORS.badRequest, 400) };
  }
  const bytes = new TextEncoder().encode(raw).length;
  if (bytes > MAX_CONTEXT_BYTES) {
    return { ok: false, response: errorResponse(AI_ERRORS.tooLarge, 413) };
  }

  // 2. Shape — strict Zod schema; unknown fields (raw rows, customer names)
  //    are rejected structurally (§21.4).
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return { ok: false, response: errorResponse(AI_ERRORS.badRequest, 400) };
  }
  const parsed = schema.safeParse(parsedJson);
  if (!parsed.success) {
    // The validation detail is deliberately not echoed back (§24).
    return { ok: false, response: errorResponse(AI_ERRORS.badRequest, 400) };
  }

  // 3. Rate limit — §22.5, counted only for well-formed requests.
  const ip = clientIp(request.headers);
  const limit = rateLimit(`ai:${ip}`, RATE_LIMIT.requests, RATE_LIMIT.windowMs);
  if (!limit.allowed) {
    return {
      ok: false,
      response: new Response(AI_ERRORS.rateLimited, {
        status: 429,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Retry-After": String(Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000))),
        },
      }),
    };
  }

  return { ok: true, data: parsed.data };
}

/** Streaming response headers shared by the analyst and report routes. */
export const STREAM_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
} as const;
