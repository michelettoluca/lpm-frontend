import { currentAdmin, logout, requestLoginCode, verifyLoginCode } from "@/app/lib/adminApi";
import {
  badRequest,
  clearedCookie,
  forwardedFor,
  missingSession,
  readSession,
  sessionCookie,
  toResponse,
} from "@/app/lib/adminRoute";

/**
 * Login and session.
 *
 *   POST   { email }        → email a login code
 *   POST   { email, code }  → check the code; on success set the session cookie
 *   GET                     → the signed-in admin, or 401
 *   DELETE                  → end the session
 *
 * The API throttles code requests and wrong codes per forwarded address, so
 * nothing here needs its own limit.
 */
export async function POST(request: Request) {
  let body: { email?: unknown; code?: unknown };
  try {
    body = await request.json();
  } catch {
    return badRequest({ kind: "bad_request", message: "malformed request body" });
  }
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) return badRequest({ kind: "bad_request", message: "enter your email" });
  const from = forwardedFor(request);

  if (body.code === undefined) {
    return toResponse(await requestLoginCode(email, from));
  }
  const code = typeof body.code === "string" ? body.code.replace(/\s/g, "") : "";
  const result = await verifyLoginCode(email, code, from);
  if (!result.ok) return toResponse(result);
  // The token stays in the cookie; the browser only learns who signed in.
  return Response.json(result.data.admin, {
    headers: { "Set-Cookie": sessionCookie(result.data.token, result.data.expires_at) },
  });
}

export async function GET(request: Request) {
  const token = readSession(request);
  if (!token) return missingSession();
  const result = await currentAdmin(token, forwardedFor(request));
  return toResponse(result, result.ok ? undefined : { "Set-Cookie": clearedCookie() });
}

export async function DELETE(request: Request) {
  const token = readSession(request);
  if (token) await logout(token);
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearedCookie() } });
}
