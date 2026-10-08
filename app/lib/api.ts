// LPM_API_BASE points a local dev server at a local backend.
const BASE = process.env.LPM_API_BASE ?? "https://api.legapaupermilano.it";

/** Tag on every public API fetch, so an admin write can expire them all. */
export const PUBLIC_DATA_TAG = "api";

export type Season = {
  is_active: boolean;
  id: number;
  name: string;
  started_at: string;
  ended_at: string | null;
  /** Best results that count toward the season total; null counts all. */
  counted_events: number | null;
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

/** The archetype a player brought to a tappa. */
export type Deck = { id: number; name: string; colors: string[] };

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
  /** The player's deck, null when nobody knows it. */
  deck: Deck | null;
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
  /** False when the result falls outside the season's best counted_events. */
  counted: boolean;
  /** The player's deck, null when nobody knows it. */
  deck: Deck | null;
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

/** One archetype at one tappa: how many brought it and how it did. */
export type MetagameArchetype = {
  archetype_id: number;
  name: string;
  /** WUBRG letters; may be empty. */
  colors: string[];
  players: number;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  /** Apart from wins: a deck's record leaves them out. */
  byes: number;
  best_rank: number;
  /** The most points one of its players made. */
  best_points: number;
};

/** The decks declared at an imported tappa, by archetype, most played first. Names no players. */
export type Metagame = {
  /** Everyone in the standings. */
  players: number;
  /** Players whose deck is known. */
  declared: number;
  archetypes: MetagameArchetype[];
};

/** Matches and games won, lost and drawn. Byes and intentional draws are never counted. */
export type MatchRecord = {
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  games_won: number;
  games_lost: number;
  games_drawn: number;
};

/**
 * An archetype in a matrix, most played first: decks is how many times it was
 * brought under the filter, matches how many matches it played.
 */
export type StatsArchetype = { id: number; name: string; colors: string[]; decks: number; matches: number };

/**
 * How one archetype did against another. Each match counts once per side; on
 * the diagonal a mirror match counts once in matches, with equal wins and losses.
 */
export type MatchupCell = MatchRecord & { archetype_id: number; opponent_archetype_id: number };

/** A matchup matrix: rows most brought first, cells only where the two decks met. */
export type MatchupMatrix = { archetypes: StatsArchetype[]; cells: MatchupCell[] };

/** An archetype a player brought, and how it went. */
export type PlayerDeck = Omit<StatsArchetype, "matches"> & MatchRecord & { points: number; best_points: number };

async function get<T>(path: string): Promise<T | null> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate: 60, tags: [PUBLIC_DATA_TAG] } });
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

/**
 * The tappa's decks by archetype. Null when there are none, or when the
 * backend does not serve them: the page goes on without the section.
 */
export async function getEventMetagame(id: string | number): Promise<Metagame | null> {
  try {
    const data = await get<Metagame>(`/events/${id}/archetypes`);
    return data && Array.isArray(data.archetypes) ? data : null;
  } catch {
    return null;
  }
}

/** Ids for `?season=`, or nothing for every season. */
const seasonQuery = (seasons: number[]) => seasons.map((id) => `season=${id}`);

/**
 * A matchup matrix over the seasons given (every season when empty), one
 * tappa, or one player's side. Null when the backend does not serve it.
 */
export async function getMatchups(filter: { seasons?: number[]; event?: number; player?: number }): Promise<MatchupMatrix | null> {
  const query = [
    ...seasonQuery(filter.seasons ?? []),
    ...(filter.event ? [`event=${filter.event}`] : []),
    ...(filter.player ? [`player=${filter.player}`] : []),
  ].join("&");
  try {
    const data = await get<MatchupMatrix>(`/stats/matchups${query ? `?${query}` : ""}`);
    return data && Array.isArray(data.archetypes) && Array.isArray(data.cells) ? data : null;
  } catch {
    return null;
  }
}

/** The archetypes a player brought in the seasons given (every season when empty). Empty when unknown. */
export async function getPlayerDecks(id: string | number, seasons: number[]): Promise<PlayerDeck[]> {
  const query = seasonQuery(seasons).join("&");
  try {
    const data = await get<PlayerDeck[]>(`/players/${id}/decks${query ? `?${query}` : ""}`);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
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
