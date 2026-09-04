/**
 * Server-side client for the LPM admin API.
 *
 * This module reads `ADMIN_API_KEY` and must never be imported from a Client
 * Component — only from route handlers and Server Components. Shared types live
 * in `adminTypes.ts` so the client can import those without reaching this file.
 * The Go API also ships no CORS middleware, so every call to it — admin or
 * public — has to originate on the server rather than in the browser.
 */

import type {
  AdminError,
  ImportField,
  ImportResult,
  ResetResult,
  Season,
} from "./adminTypes";

const BASE = "https://api.legapaupermilano.it";

export type AdminResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: AdminError };

function apiKey(): string | null {
  const key = process.env.ADMIN_API_KEY?.trim();
  return key ? key : null;
}

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
  if (m.includes("season_id") || m.includes("season id")) return "season_id";
  if (m.includes("confirm")) return "confirm";
  if (m.includes("played_at") || m.includes("played at")) return "played_at";
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
 * through without being re-encoded.
 */
async function adminFetch<T>(
  path: string,
  init: { method: string; body?: BodyInit; contentType?: string },
): Promise<AdminResult<T>> {
  const key = apiKey();
  if (!key) {
    return {
      ok: false,
      status: 500,
      error: {
        kind: "not_configured",
        message:
          "ADMIN_API_KEY is not set on this web server, so admin actions cannot be sent.",
      },
    };
  }

  const headers: Record<string, string> = { "X-API-Key": key };
  if (init.contentType) headers["Content-Type"] = init.contentType;

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

/** Public endpoint, but proxied through the server because the API sends no CORS headers. */
export async function listSeasons(): Promise<Season[]> {
  const res = await fetch(`${BASE}/seasons`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET /seasons failed: ${res.status}`);
  return res.json();
}

export function createSeason(name: string): Promise<AdminResult<Season>> {
  return adminFetch<Season>("/admin/seasons", {
    method: "POST",
    contentType: "application/json",
    body: JSON.stringify({ name }),
  });
}

export function importMelee(
  seasonId: number,
  body: FormData,
): Promise<AdminResult<ImportResult>> {
  // season_id goes in the query string; everything else is multipart.
  // Content-Type is left unset so fetch writes the multipart boundary itself.
  return adminFetch<ImportResult>(`/admin/import/melee?season_id=${seasonId}`, {
    method: "POST",
    body,
  });
}

export function resetDatabase(
  includeSeasons: boolean,
): Promise<AdminResult<ResetResult>> {
  const query = includeSeasons
    ? "?confirm=RESET&include_seasons=true"
    : "?confirm=RESET";
  return adminFetch<ResetResult>(`/admin/reset${query}`, { method: "POST" });
}

/** True when this web server has a key to send. Safe to expose — it leaks no value. */
export function adminKeyConfigured(): boolean {
  return apiKey() !== null;
}
