import { adminFetch, type AdminResult } from "./adminApi";
import type { AdminError } from "./adminTypes";

/**
 * Every admin proxy route answers with either the upstream payload or
 * `{ error }`. Failures keep the upstream status so the client can react, and
 * carry a `kind` so the UI can pick a presentation without re-parsing English
 * error text.
 */
export function toResponse<T>(result: AdminResult<T>, headers?: HeadersInit): Response {
  if (result.ok) {
    return Response.json(result.data, { status: result.status, headers });
  }
  return Response.json({ error: result.error }, { status: result.status, headers });
}

export function badRequest(error: AdminError): Response {
  return Response.json({ error }, { status: 400 });
}

/**
 * The admin key lives in an HTTP-only cookie scoped to the proxy routes. The
 * browser never sees it: the gate posts it once to `/api/admin/auth`, the API
 * validates it, and from then on the cookie rides along automatically.
 */
const COOKIE = "lpm_admin_key";
const COOKIE_PATH = "/api/admin";
const SESSION_SECONDS = 8 * 60 * 60;

export function readKey(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE) {
      const value = decodeURIComponent(rest.join("=")).trim();
      return value || null;
    }
  }
  return null;
}

export function sessionCookie(key: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${encodeURIComponent(key)}; Path=${COOKIE_PATH}; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure}`;
}

export function clearedCookie(): string {
  return `${COOKIE}=; Path=${COOKIE_PATH}; HttpOnly; SameSite=Strict; Max-Age=0`;
}

export function missingKey(): Response {
  return Response.json(
    {
      error: {
        kind: "missing_key",
        message: "no admin session; enter the key again",
      } satisfies AdminError,
    },
    { status: 401, headers: { "Set-Cookie": clearedCookie() } },
  );
}

/**
 * The API rate-limits wrong keys per client address, but it only ever sees
 * this server. Caddy puts the browser's address in X-Forwarded-For; pass it
 * through so the limit lands on the right client.
 */
export function forwardedFor(request: Request): string | undefined {
  return request.headers.get("x-forwarded-for") ?? undefined;
}

/**
 * Forward a request to an admin endpoint using the session cookie. A 401 or
 * 429 from the API means the session is no longer usable, so the cookie is
 * cleared in the same response and the UI falls back to the gate.
 */
export async function proxy<T>(
  request: Request,
  path: string,
  init: { method: string; body?: BodyInit; contentType?: string },
): Promise<Response> {
  const key = readKey(request);
  if (!key) return missingKey();
  const result = await adminFetch<T>(path, key, { ...init, forwardedFor: forwardedFor(request) });
  const lost = !result.ok && (result.status === 401 || result.status === 429);
  return toResponse(result, lost ? { "Set-Cookie": clearedCookie() } : undefined);
}
