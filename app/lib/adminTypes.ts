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
  | "disabled"
  | "conflict"
  | "verification"
  | "bad_request"
  | "server"
  | "network";

export type ImportField =
  | "season_id"
  | "name"
  | "played_at"
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
