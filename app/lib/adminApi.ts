/**
 * Server-side client for the LPM admin API.
 *
 * The admin key is not stored anywhere: the organiser types it into the page and
 * it arrives here per request, so every function below takes it as an argument.
 *
 * These calls still have to run on the server. The Go API ships no CORS
 * middleware, so a direct cross-origin request from the browser would be
 * blocked at preflight regardless of where the key came from.
 */

import type { AdminError, ImportField } from "./adminTypes";

const BASE = "https://api.legapaupermilano.it";

export type AdminResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: AdminError };

/** The verification failure is the one 500 that is a data problem, not a crash. */
function isVerificationFailure(message: string): boolean {
  return message.includes("computed standings do not match");
}

/**
 * Guess which form field a 400 concerns. The backend returns free text, so this
 * is substring matching and deliberately returns undefined when unsure — an
 * unattributed message still renders at the top of the form.
 */
function fieldForMessage(message: string): ImportField | undefined {
  const m = message.toLowerCase();
  if (m.includes("event_id")) return "event_id";
  if (m.includes("season_id") || m.includes("season id")) return "season_id";
  if (m.includes("confirm")) return "confirm";
  if (m.includes("played_at") || m.includes("played at")) return "played_at";
  if (m.includes("ended_at")) return "ended_at";
  if (m.includes("started_at")) return "started_at";
  if (m.includes("standings")) return "standings";
  if (m.includes("matches")) return "matches";
  if (m.includes("name")) return "name";
  return undefined;
}

async function readError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const parsed: unknown = JSON.parse(text);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as { error?: unknown }).error === "string"
    ) {
      return (parsed as { error: string }).error;
    }
  } catch {
    // Not JSON — fall through and surface whatever the server sent.
  }
  return text.trim() || `request failed with status ${res.status}`;
}

function classify(status: number, message: string): AdminError {
  if (status === 401) return { kind: "unauthorized", message };
  if (status === 429) return { kind: "throttled", message };
  if (status === 503) return { kind: "disabled", message };
  if (status === 409) return { kind: "conflict", message };
  if (status === 400) {
    return { kind: "bad_request", message, field: fieldForMessage(message) };
  }
  if (isVerificationFailure(message)) return { kind: "verification", message };
  return { kind: "server", message };
}

/**
 * Send a request to an admin endpoint with the shared secret attached.
 * `body` is forwarded untouched, which keeps multipart uploads streaming
 * through without being re-encoded. `forwardedFor` carries the browser's
 * address so the API's per-client attempt limit applies to the right client.
 */
export async function adminFetch<T>(
  path: string,
  apiKey: string,
  init: { method: string; body?: BodyInit; contentType?: string; forwardedFor?: string },
): Promise<AdminResult<T>> {
  const headers: Record<string, string> = { "X-API-Key": apiKey };
  if (init.contentType) headers["Content-Type"] = init.contentType;
  if (init.forwardedFor) headers["X-Forwarded-For"] = init.forwardedFor;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: init.method,
      headers,
      body: init.body,
      cache: "no-store",
    });
  } catch (cause) {
    return {
      ok: false,
      status: 502,
      error: {
        kind: "network",
        message:
          cause instanceof Error
            ? `could not reach the API: ${cause.message}`
            : "could not reach the API",
      },
    };
  }

  if (!res.ok) {
    const message = await readError(res);
    return { ok: false, status: res.status, error: classify(res.status, message) };
  }

  return { ok: true, status: res.status, data: (await res.json()) as T };
}

/** Validate a key without doing anything else. */
export function checkKey(
  apiKey: string,
  forwardedFor?: string,
): Promise<AdminResult<{ ok: true }>> {
  return adminFetch<{ ok: true }>("/admin/auth", apiKey, { method: "GET", forwardedFor });
}

/**
 * event_id selects the existing event; the CSV files are multipart.
 * Content-Type is left unset so fetch writes the multipart boundary itself.
 */
export function importPath(eventId: number): string {
  return `/admin/import/melee?event_id=${eventId}`;
}

export function resetPath(includeSeasons: boolean): string {
  return includeSeasons
    ? "/admin/reset?confirm=RESET&include_seasons=true"
    : "/admin/reset?confirm=RESET";
}
