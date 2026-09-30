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
  | "forbidden"
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
  | "counted_events"
  | "standings"
  | "matches"
  | "tournament_id"
  | "confirm";

export type AdminError = {
  kind: AdminErrorKind;
  /** Raw message from the API. May be multi-line for `verification`. */
  message: string;
  /** Form field the message concerns, when it can be attributed to one. */
  field?: ImportField;
};

/** A dashboard account. Only the super admin manages other admins. */
export type AdminAccount = { id: number; email: string; is_super: boolean };

export type AdminListEntry = AdminAccount & { created_at: string };

export type AdminSession = { token: string; expires_at: string; admin: AdminAccount };

export type Season = {
  is_active: boolean;
  id: number;
  name: string;
  started_at: string;
  ended_at: string | null;
  /** Best results that count toward the season total; null counts all. */
  counted_events: number | null;
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

/** A Melee tournament offered for import, as the backend reads it from the Melee API. */
export type MeleeTournament = {
  id: number;
  name: string;
  /** When the last round was paired; null before the first pairing. Melee sends no start date. */
  last_pair_date: string | null;
  /** Melee's own status text, such as "Ended"; empty when Melee sent none. */
  status: string;
  ended: boolean;
  url: string;
  /** The event already holding this tournament's results. */
  imported_event_id: number | null;
  /** Started on the event's day, in Rome. */
  same_day: boolean;
};

export type MeleeSyncSkipReason = "no_tournament" | "ambiguous" | "not_ended" | "too_old" | "failed";

export type MeleeSyncResult = {
  imported: { event_id: number; event_name: string; tournament_id: number; tournament_name: string }[];
  skipped: {
    event_id: number;
    event_name: string;
    played_at: string;
    reason: MeleeSyncSkipReason;
    error?: string;
    candidates?: MeleeTournament[];
  }[];
};
