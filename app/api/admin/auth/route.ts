import { checkKey } from "@/app/lib/adminApi";
import {
  badRequest,
  clearedCookie,
  forwardedFor,
  missingKey,
  readKey,
  sessionCookie,
  toResponse,
} from "@/app/lib/adminRoute";

/**
 * The gate.
 *
 *   POST   { key }  → validate against the API; on success set the session cookie
 *   GET             → is the current session cookie still accepted?
 *   DELETE          → forget the session
 *
 * The API counts wrong keys per forwarded address and answers 429 once the
 * budget is spent, so nothing here needs its own throttle.
 */
export async function POST(request: Request) {
  let body: { key?: unknown };
  try {
    body = await request.json();
  } catch {
    return badRequest({ kind: "bad_request", message: "malformed request body" });
  }
  const key = typeof body.key === "string" ? body.key.trim() : "";
  if (!key) return badRequest({ kind: "bad_request", message: "enter the admin key" });

  const result = await checkKey(key, forwardedFor(request));
  return toResponse(result, result.ok ? { "Set-Cookie": sessionCookie(key) } : undefined);
}

export async function GET(request: Request) {
  const key = readKey(request);
  if (!key) return missingKey();
  const result = await checkKey(key, forwardedFor(request));
  // A refreshed cookie on success pushes the expiry forward for active sessions.
  const cookie = result.ok ? sessionCookie(key) : clearedCookie();
  return toResponse(result, { "Set-Cookie": cookie });
}

export async function DELETE() {
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearedCookie() } });
}
