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
