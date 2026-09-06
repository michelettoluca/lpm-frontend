/**
 * Types shared between the admin proxy routes and the client UI.
 *
 * Kept apart from `adminApi.ts` so Client Components import only types, never
 * the module that talks to the upstream API.
 */

/** Discriminator the client UI switches on to pick an error presentation. */
export type AdminErrorKind =
  | "missing_key"
  | "unauthorized"
  | "throttled"
  | "disabled"
  | "conflict"
  | "verification"
  | "bad_request"
  | "server"
  | "network";

/** Form fields a 400 can be attributed to, across the import and CRUD forms. */
export type ImportField =
  | "event_id"
  | "season_id"
  | "name"
  | "played_at"
  | "started_at"
  | "ended_at"
  | "standings"
  | "matches"
  | "confirm";

export type AdminError = {
  kind: AdminErrorKind;
  /** Raw message from the API. May be multi-line for `verification`. */
  message: string;
  /** Form field the message concerns, when it can be attributed to one. */
  field?: ImportField;
};

export type Season = {
  is_active: boolean;
  id: number;
  name: string;
  started_at: string;
  ended_at: string | null;
};

export type ImportResult = {
  melee_tournament_id: number;
  event_id: number;
};

export type DeletedCounts = {
  seasons: number;
  events: number;
  users: number;
  matches: number;
  standings: number;
};

export type ResetResult = {
  deleted: DeletedCounts;
  seasons_cleared: boolean;
};

export type ManagedEvent = { id: number; season_id: number; name: string; format: string | null; played_at: string; has_results: boolean };
