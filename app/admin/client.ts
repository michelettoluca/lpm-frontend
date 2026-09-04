import type { AdminError } from "@/app/lib/adminTypes";

export type CallResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: AdminError };

function isAdminError(value: unknown): value is AdminError {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as AdminError).kind === "string" &&
    typeof (value as AdminError).message === "string"
  );
}

/**
 * Call one of our own `/api/admin/*` proxy routes. Never called with a retry
 * wrapper: every admin action here is destructive or non-idempotent.
 */
export async function callAdmin<T>(
  url: string,
  init: RequestInit,
): Promise<CallResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    return {
      ok: false,
      error: {
        kind: "network",
        message: "la richiesta non è partita dal browser",
      },
    };
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    // A proxy route crashed and returned an HTML error page rather than JSON.
    return {
      ok: false,
      error: {
        kind: "server",
        message: `risposta non valida dal server (HTTP ${res.status})`,
      },
    };
  }

  if (!res.ok) {
    const wrapped = (body as { error?: unknown })?.error;
    return {
      ok: false,
      error: isAdminError(wrapped)
        ? wrapped
        : { kind: "server", message: `HTTP ${res.status}` },
    };
  }

  return { ok: true, data: body as T };
}
