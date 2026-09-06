const BASE = "https://api.legapaupermilano.it";

export type Season = {
  is_active: boolean;
  id: number;
  name: string;
  started_at: string;
  ended_at: string | null;
};

export type LeaderboardEntry = {
  player_id: number;
  display_name: string;
  total_points: number;
  events_played: number;
};

export type EventSummary = {
  has_results?: boolean;
  id: number;
  season_id: number;
  name: string;
  format: string;
  played_at: string;
};

export type Standing = {
  event_id: number;
  player_id: number;
  player_name: string;
  rank: number;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  byes: number;
  mwp: number;
  gwp: number;
  omw: number;
  ogw: number;
};

export type EventDetail = {
  event: EventSummary;
  standings: Standing[];
};

export type Player = {
  id: number;
  external_id: number;
  display_name: string;
};

export type PlayerEventEntry = {
  event: EventSummary;
  rank: number;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  byes: number;
  mwp: number;
  gwp: number;
  omw: number;
  ogw: number;
};

export type H2HMatch = {
  event_id: number;
  event_name: string;
  round_no: number;
  wins: number;
  losses: number;
  draws: number;
};

export type H2HOpponent = {
  opponent_id: number;
  opponent_name: string;
  matches: H2HMatch[];
};

/**
 * One table of one Swiss round. The public API does not expose this
 * resource yet; `getPairings` returns an empty list until it does.
 */
export type Pairing = {
  round: number;
  table: number;
  player_a_id: number;
  player_a_name: string;
  player_b_id: number | null;
  player_b_name: string | null;
  wins_a: number;
  wins_b: number;
  draws: number;
  /** W-L-D before the round, e.g. "2-0-0" */
  record_a: string;
  record_b: string;
};

async function get<T>(path: string): Promise<T | null> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate: 60 } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function getSeasons(): Promise<Season[]> {
  return (await get<Season[]>(`/seasons`)) ?? [];
}

/** The season explicitly selected by an administrator. */
export function getActiveSeason(): Promise<Season | null> {
  return get<Season>("/seasons/active");
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const season = await getActiveSeason();
  if (!season) return [];
  return (await get<LeaderboardEntry[]>(`/seasons/${season.id}/leaderboard`)) ?? [];
}

export async function getEvents(): Promise<EventSummary[]> {
  const season = await getActiveSeason();
  if (!season) return [];
  return (await get<EventSummary[]>(`/seasons/${season.id}/events`)) ?? [];
}

export function getEvent(id: string | number): Promise<EventDetail | null> {
  return get<EventDetail>(`/events/${id}`);
}

export async function getPairings(id: string | number): Promise<Pairing[]> {
  const data = await get<unknown>(`/events/${id}/pairings`);
  if (!Array.isArray(data)) return [];
  return data.filter(
    (p): p is Pairing =>
      typeof p === "object" &&
      p !== null &&
      typeof (p as Pairing).round === "number" &&
      typeof (p as Pairing).table === "number" &&
      typeof (p as Pairing).player_a_name === "string",
  );
}

export function getPlayer(id: string | number): Promise<Player | null> {
  return get<Player>(`/players/${id}`);
}

export async function getPlayerEvents(
  id: string | number,
): Promise<PlayerEventEntry[]> {
  const season = await getActiveSeason();
  if (!season) return [];
  return (
    (await get<PlayerEventEntry[]>(
      `/players/${id}/events?season=${season.id}`,
    )) ?? []
  );
}

export async function getHeadToHead(
  id: string | number,
): Promise<H2HOpponent[]> {
  const season = await getActiveSeason();
  if (!season) return [];
  const data = await get<{ opponents?: H2HOpponent[] }>(
    `/players/${id}/head-to-head?season=${season.id}`,
  );
  return data?.opponents ?? [];
}
