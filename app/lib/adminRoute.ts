import { revalidateTag } from "next/cache";
import { adminFetch, type AdminResult } from "./adminApi";
import { PUBLIC_DATA_TAG } from "./api";
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
 * The admin's session token lives in an HTTP-only cookie scoped to the proxy
 * routes. The browser never sees it: `/api/admin/auth` sets it when a login
 * code checks out, and from then on the cookie rides along automatically.
 */
const COOKIE = "lpm_admin_session";
const COOKIE_PATH = "/api/admin";

export function readSession(request: Request): string | null {
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

/** Cookie for a session token, expiring when the API's session does. */
export function sessionCookie(token: string, expiresAt: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const maxAge = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  return `${COOKIE}=${encodeURIComponent(token)}; Path=${COOKIE_PATH}; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

export function clearedCookie(): string {
  return `${COOKIE}=; Path=${COOKIE_PATH}; HttpOnly; SameSite=Strict; Max-Age=0`;
}

export function missingSession(): Response {
  return Response.json(
    {
      error: {
        kind: "missing_key",
        message: "no admin session; sign in again",
      } satisfies AdminError,
    },
    { status: 401, headers: { "Set-Cookie": clearedCookie() } },
  );
}

/**
 * The API rate-limits login attempts per client address, but it only ever sees
 * this server. Caddy puts the browser's address in X-Forwarded-For; pass it
 * through so the limit lands on the right client.
 */
export function forwardedFor(request: Request): string | undefined {
  return request.headers.get("x-forwarded-for") ?? undefined;
}

/**
 * Forward a request to an admin endpoint using the session cookie. A 401 from
 * the API means the session is gone, so the cookie is cleared in the same
 * response and the UI falls back to the login screen. A successful
 * write expires the public pages' cached API data, so the next visit renders
 * fresh results instead of one stale-while-revalidate round behind.
 */
export async function proxy<T>(
  request: Request,
  path: string,
  init: { method: string; body?: BodyInit; contentType?: string },
): Promise<Response> {
  const token = readSession(request);
  if (!token) return missingSession();
  const result = await adminFetch<T>(path, token, { ...init, forwardedFor: forwardedFor(request) });
  if (result.ok && init.method !== "GET") revalidateTag(PUBLIC_DATA_TAG, { expire: 0 });
  const lost = !result.ok && result.status === 401;
  return toResponse(result, lost ? { "Set-Cookie": clearedCookie() } : undefined);
}
