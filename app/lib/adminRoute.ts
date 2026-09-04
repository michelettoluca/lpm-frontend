import type { AdminResult } from "./adminApi";
import type { AdminError } from "./adminTypes";

/**
 * Every admin proxy route answers with either the upstream payload or
 * `{ error }`. Failures keep the upstream status so the client can react, and
 * carry a `kind` so the UI can pick a presentation without re-parsing English
 * error text.
 */
export function toResponse<T>(result: AdminResult<T>): Response {
  if (result.ok) {
    return Response.json(result.data, { status: result.status });
  }
  return Response.json({ error: result.error }, { status: result.status });
}

export function badRequest(error: AdminError): Response {
  return Response.json({ error }, { status: 400 });
}

/** Header the browser uses to hand this app the key the organiser typed in. */
export const KEY_HEADER = "X-Admin-Key";

/**
 * Pull the admin key off an incoming request. The key is never stored on the
 * server, so a request without one is a client bug — the UI disables every
 * action until a key is entered.
 */
export function readKey(request: Request): string | null {
  const key = request.headers.get(KEY_HEADER)?.trim();
  return key ? key : null;
}

export function missingKey(): Response {
  return Response.json(
    {
      error: {
        kind: "missing_key",
        message: "no admin key was sent with the request",
      },
    },
    { status: 401 },
  );
}
