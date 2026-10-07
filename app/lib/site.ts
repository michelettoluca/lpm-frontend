/**
 * What the public pages show, loaded and worked out from the API: one loader
 * per page, so the pages only lay it out.
 */
import {
  getActiveSeason,
  getEvent,
  getEventMetagame,
  getEvents,
  getHeadToHead,
  getLeaderboard,
  getMatchups,
  getPairings,
  getPlayer,
  getPlayerDecks,
  getPlayerEvents,
  getSeasons,
  type EventSummary,
  type H2HOpponent,
  type LeaderboardEntry,
  type MatchRecord,
  type MatchupMatrix,
  type Metagame,
  type MetagameArchetype,
  type Pairing,
  type PlayerDeck,
  type PlayerEventEntry,
  type Season,
  type Standing,
} from "./api";
import {
  dateTile,
  eventStatus,
  eventYear,
  formatDateMeta,
  isCompleted,
  splitName,
  tappaNumber,
  tappaSubtitle,
  tappaTitle,
  winPct,
} from "./format";
import { potentialGain } from "./potential";

export type { EventSummary, LeaderboardEntry, MatchRecord, MatchupMatrix, Metagame, MetagameArchetype, Pairing, PlayerDeck, PlayerEventEntry, Season, Standing };
export { dateTile, formatDateMeta, splitName, tappaNumber, tappaSubtitle, tappaTitle, winPct };

/** A tappa result of 9 points or more (3 wins) earns the star. */
export const PRIZE_POINTS = 9;
/** Tappe that count towards the season total. */
export const COUNTED_EVENTS = 8;

export type PlayedTappa = EventSummary & {
  number: number | null;
  title: string;
  players: number;
  /** Top three of the night, for a "who won" line. */
  podium: { id: number; name: string; points: number }[];
};

export type UpcomingTappa = EventSummary & { number: number | null; title: string };

export type HomeData = {
  season: Season | null;
  year: number;
  /** Full season ranking, best first. */
  leaderboard: LeaderboardEntry[];
  /** Completed tappe, most recent first. */
  played: PlayedTappa[];
  /** Scheduled tappe, soonest first. */
  upcoming: UpcomingTappa[];
  totalEvents: number;
};

const time = (e: EventSummary) => new Date(e.played_at).getTime();

export async function getHomeData(): Promise<HomeData> {
  const [leaderboard, events, season] = await Promise.all([
    getLeaderboard(),
    getEvents(),
    getActiveSeason(),
  ]);
  const playedRaw = events.filter(isCompleted).sort((a, b) => time(b) - time(a));
  const details = await Promise.all(playedRaw.map((e) => getEvent(e.id)));
  const played = playedRaw.map((e, i) => {
    const standings = details[i]?.standings ?? [];
    return {
      ...e,
      number: tappaNumber(e.name),
      title: tappaTitle(e.name),
      players: standings.length,
      podium: standings.slice(0, 3).map((s) => ({ id: s.player_id, name: s.player_name, points: s.points })),
    };
  });
  const upcoming = events
    .filter((e) => !isCompleted(e))
    .sort((a, b) => time(a) - time(b))
    .map((e) => ({ ...e, number: tappaNumber(e.name), title: tappaTitle(e.name) }));

  return {
    season,
    year: events[0] ? eventYear(events[0].played_at) : new Date().getFullYear(),
    leaderboard,
    played,
    upcoming,
    totalEvents: events.length,
  };
}

/** A completed tappa, as a column of the leaderboard. */
export type LeaderboardTappa = { id: number; number: number | null; title: string };

/** A player's points at one tappa; counted is false outside their best counted_events. */
export type TappaResult = { points: number; counted: boolean };

export type LeaderboardData = {
  season: Season | null;
  leaderboard: LeaderboardEntry[];
  /** Completed tappe, oldest first. */
  tappe: LeaderboardTappa[];
  /** Per player, one entry per tappa in the same order; null where they did not play. */
  results: Record<number, (TappaResult | null)[]>;
  /** Per player, points they can still add by going undefeated at every tappa left. */
  potential: Record<number, number>;
  /** Scheduled tappe without results yet. */
  remaining: number;
  playedEvents: number;
  totalEvents: number;
};

/**
 * Marks which results make up each season total, the way the backend ranks
 * them: best points first, ties keeping the earlier tappa.
 */
function markCounted(results: (TappaResult | null)[], counted: number | null) {
  const best = results
    .map((r, i) => ({ r, i }))
    .filter((x): x is { r: TappaResult; i: number } => x.r !== null)
    .sort((a, b) => b.r.points - a.r.points || a.i - b.i);
  best.forEach((x, k) => {
    x.r.counted = counted === null || k < counted;
  });
}

export async function getLeaderboardData(): Promise<LeaderboardData> {
  const [leaderboard, events, season] = await Promise.all([
    getLeaderboard(),
    getEvents(),
    getActiveSeason(),
  ]);
  const playedRaw = events.filter(isCompleted).sort((a, b) => time(a) - time(b));
  const details = await Promise.all(playedRaw.map((e) => getEvent(e.id)));

  const results: Record<number, (TappaResult | null)[]> = {};
  for (const entry of leaderboard) results[entry.player_id] = playedRaw.map(() => null);
  details.forEach((d, i) => {
    for (const s of d?.standings ?? []) {
      const row = results[s.player_id];
      if (row) row[i] = { points: s.points, counted: true };
    }
  });
  const counted = season ? season.counted_events : COUNTED_EVENTS;
  for (const row of Object.values(results)) markCounted(row, counted);
  const remaining = events.length - playedRaw.length;
  const potential: Record<number, number> = {};
  for (const [id, row] of Object.entries(results)) {
    const points = row.flatMap((r) => (r ? [r.points] : []));
    potential[Number(id)] = potentialGain(points, counted, remaining);
  }

  return {
    season,
    leaderboard,
    tappe: playedRaw.map((e) => ({ id: e.id, number: tappaNumber(e.name), title: tappaTitle(e.name) })),
    results,
    potential,
    remaining,
    playedEvents: playedRaw.length,
    totalEvents: events.length,
  };
}

export type Stats = SeasonStats;
export type HeadToHeadRow = ReturnType<typeof summarize>[number];

export type PlayerTappa = PlayerEventEntry & {
  number: number | null;
  title: string;
  prize: boolean;
  /** Outside the best counted tappe: shown, but not in the season total. */
  dropped: boolean;
};

export type PlayerData = {
  id: number;
  name: string;
  first: string;
  last: string;
  season: Season | null;
  /** Season position, or null when the player is not ranked. */
  rank: number | null;
  points: number;
  /** Tappe played, most recent first. */
  tappe: PlayerTappa[];
  /** Season match record, byes counted as wins. */
  wins: number;
  losses: number;
  draws: number;
  matches: number;
  winPct: string;
  /** Tappe completed so far in the season. */
  playedSoFar: number;
  /** Null when the player has no tappe this season. */
  stats: Stats | null;
  /** Every opponent met, most-faced first. */
  headToHead: HeadToHeadRow[];
  /** Everyone else in the ranking, for an opponent picker. */
  others: { id: number; name: string }[];
};

export async function getPlayerData(id: string): Promise<PlayerData | null> {
  const [player, entries, leaderboard, events, season, opponents] = await Promise.all([
    getPlayer(id),
    getPlayerEvents(id),
    getLeaderboard(),
    getEvents(),
    getActiveSeason(),
    getHeadToHead(id),
  ]);
  if (!player) return null;

  const rankIndex = leaderboard.findIndex((e) => e.player_id === player.id);
  const wins = entries.reduce((s, e) => s + e.wins + e.byes, 0);
  const losses = entries.reduce((s, e) => s + e.losses, 0);
  const draws = entries.reduce((s, e) => s + e.draws, 0);
  const { first, last } = splitName(player.display_name);

  return {
    id: player.id,
    name: player.display_name,
    first,
    last,
    season,
    rank: rankIndex >= 0 ? rankIndex + 1 : null,
    points:
      rankIndex >= 0
        ? leaderboard[rankIndex].total_points
        : entries.reduce((s, e) => s + (e.counted === false ? 0 : e.points), 0),
    tappe: [...entries]
      .sort((a, b) => time(b.event) - time(a.event))
      .map((e) => ({
        ...e,
        number: tappaNumber(e.event.name),
        title: tappaTitle(e.event.name),
        prize: e.points >= PRIZE_POINTS,
        dropped: e.counted === false,
      })),
    wins,
    losses,
    draws,
    matches: wins + losses + draws,
    winPct: winPct(wins, losses, draws),
    playedSoFar: events.filter(isCompleted).length,
    stats: computeStats(entries, opponents),
    headToHead: summarize(opponents),
    others: leaderboard
      .filter((e) => e.player_id !== player.id)
      .map((e) => ({ id: e.player_id, name: e.display_name })),
  };
}

export type EventData = {
  event: EventSummary;
  number: number | null;
  title: string;
  subtitle: string;
  date: string;
  status: "conclusa" | "in corso" | "prossima" | "in programma";
  hasResults: boolean;
  /** Final standings, best first. Empty before results are imported. */
  standings: (Standing & { prize: boolean })[];
  /** Swiss pairings per round. The public API does not serve them yet, so this is usually empty. */
  pairings: Pairing[];
  rounds: number;
  /** Decks declared, by archetype; null when nobody's deck is known. */
  metagame: Metagame | null;
  /** The night's matchups; null when no match between two known decks. */
  matchups: MatchupMatrix | null;
};

export async function getEventData(id: string): Promise<EventData | null> {
  const [data, pairings, metagame, matchups] = await Promise.all([
    getEvent(id),
    getPairings(id),
    getEventMetagame(id),
    getMatchups({ event: Number(id) }),
  ]);
  if (!data) return null;
  const { event, standings } = data;
  const roundsPlayed = standings.reduce((max, s) => Math.max(max, s.wins + s.losses + s.draws + s.byes), 0);
  return {
    event,
    number: tappaNumber(event.name),
    title: tappaTitle(event.name),
    subtitle: tappaSubtitle(event.name),
    date: formatDateMeta(event.played_at),
    status: event.has_results === false ? "in programma" : eventStatus(event.played_at),
    hasResults: event.has_results !== false,
    standings: standings.map((s) => ({ ...s, prize: s.points >= PRIZE_POINTS })),
    pairings,
    rounds: Math.max(roundsPlayed, pairings.reduce((max, p) => Math.max(max, p.round), 0)),
    metagame: metagame && metagame.declared > 0 ? metagame : null,
    matchups: matchups && matchups.cells.length > 0 ? matchups : null,
  };
}

/** The seasons the statistics can show, and which is shown: one season, or "tutte". */
export type SeasonChoice = {
  /** Every season, most recent first. */
  seasons: Season[];
  selected: number | "tutte";
  /** Season ids for the API; empty means every season. */
  ids: number[];
};

/**
 * Reads `?stagione=` (a season id or "tutte"). Without one, or with one that
 * does not exist, it is the active season, else the most recent.
 */
export async function chooseSeason(param: string | string[] | undefined): Promise<SeasonChoice> {
  const [all, active] = await Promise.all([getSeasons(), getActiveSeason()]);
  const seasons = [...all].sort((a, b) => b.started_at.localeCompare(a.started_at));
  const wanted = Array.isArray(param) ? param[0] : param;
  if (wanted === "tutte") return { seasons, selected: "tutte", ids: [] };
  const chosen = seasons.find((s) => String(s.id) === wanted) ?? active ?? seasons[0];
  return chosen ? { seasons, selected: chosen.id, ids: [chosen.id] } : { seasons, selected: "tutte", ids: [] };
}

export type StatsData = { choice: SeasonChoice; matrix: MatchupMatrix | null };

/** The league's matchup matrix for the chosen season. */
export async function getStatsData(param: string | string[] | undefined): Promise<StatsData> {
  const choice = await chooseSeason(param);
  return { choice, matrix: await getMatchups({ seasons: choice.ids }) };
}

export type PlayerDecksData = {
  choice: SeasonChoice;
  /** The archetypes the player brought, most brought first. */
  decks: PlayerDeck[];
  /** The player's side of their matches, by their deck and the opponent's. */
  matrix: MatchupMatrix | null;
  /** Every archetype in the league over the same seasons, for the matrix's columns. */
  league: MatchupMatrix | null;
  /** Whether the player has a known deck in any season, to offer the others when this one has none. */
  anyDeck: boolean;
};

export async function getPlayerDecksData(id: string, param: string | string[] | undefined): Promise<PlayerDecksData> {
  const choice = await chooseSeason(param);
  const [decks, matrix, league, ever] = await Promise.all([
    getPlayerDecks(id, choice.ids),
    getMatchups({ seasons: choice.ids, player: Number(id) }),
    getMatchups({ seasons: choice.ids }),
    choice.ids.length > 0 ? getPlayerDecks(id, []) : null,
  ]);
  return { choice, decks, matrix, league, anyDeck: decks.length > 0 || (ever ?? []).length > 0 };
}

export async function getSeason(): Promise<Season | null> {
  return getActiveSeason();
}

const TOP_CUT = 8;

type Rival = { id: number; name: string; count: number; record: string };

type SeasonStats = {
  events: number;
  bestRank: number;
  bestRankTimes: number;
  avgRank: number;
  topCut: number;
  totalPoints: number;
  avgPoints: number;
  gamesWon: number;
  gamesLost: number;
  gamesDrawn: number;
  matchWins: number;
  cleanWins: number;
  longestStreak: number;
  avgOmw: number;
  opponents: number;
  mostFaced: Rival | null;
  nemesis: Rival | null;
  victim: Rival | null;
};

/**
 * Season statistics over every tappa and every match the player took part
 * in, including tappe that fall outside the season's counted results.
 */
function computeStats(entries: PlayerEventEntry[], opponents: H2HOpponent[]): SeasonStats | null {
  if (entries.length === 0) return null;

  const ranks = entries.map((e) => e.rank);
  const bestRank = Math.min(...ranks);
  const totalPoints = entries.reduce((s, e) => s + e.points, 0);

  const playedAt = new Map(entries.map((e) => [e.event.id, new Date(e.event.played_at).getTime()]));
  const matches = opponents.flatMap((o) => o.matches);
  const gamesWon = matches.reduce((s, m) => s + m.wins, 0);
  const gamesLost = matches.reduce((s, m) => s + m.losses, 0);
  const gamesDrawn = matches.reduce((s, m) => s + m.draws, 0);
  const won = matches.filter((m) => m.wins > m.losses);

  // Longest run of won matches in play order. Byes have no opponent, so they
  // are not in the head-to-head data and neither extend nor break a run.
  const ordered = [...matches].sort(
    (a, b) => (playedAt.get(a.event_id) ?? 0) - (playedAt.get(b.event_id) ?? 0) || a.round_no - b.round_no,
  );
  let run = 0;
  let longestStreak = 0;
  for (const m of ordered) {
    run = m.wins > m.losses ? run + 1 : 0;
    longestStreak = Math.max(longestStreak, run);
  }

  const rivals = opponents.map((o) => {
    let w = 0;
    let l = 0;
    let d = 0;
    for (const m of o.matches) {
      if (m.wins > m.losses) w++;
      else if (m.losses > m.wins) l++;
      else d++;
    }
    return { id: o.opponent_id, name: o.opponent_name, played: o.matches.length, w, l, record: `${w}-${l}-${d}` };
  });
  // A rival only means something once it happened more than once.
  const pick = (score: (r: (typeof rivals)[number]) => number, tie: (r: (typeof rivals)[number]) => number) => {
    const best = [...rivals].sort((a, b) => score(b) - score(a) || tie(a) - tie(b) || a.name.localeCompare(b.name))[0];
    return best && score(best) >= 2 ? { id: best.id, name: best.name, count: score(best), record: best.record } : null;
  };

  return {
    events: entries.length,
    bestRank,
    bestRankTimes: ranks.filter((r) => r === bestRank).length,
    avgRank: ranks.reduce((s, r) => s + r, 0) / ranks.length,
    topCut: ranks.filter((r) => r <= TOP_CUT).length,
    totalPoints,
    avgPoints: totalPoints / entries.length,
    gamesWon,
    gamesLost,
    gamesDrawn,
    matchWins: won.length,
    cleanWins: won.filter((m) => m.losses === 0 && m.draws === 0).length,
    longestStreak,
    avgOmw: entries.reduce((s, e) => s + e.omw, 0) / entries.length,
    opponents: opponents.length,
    mostFaced: pick((r) => r.played, (r) => -r.w),
    nemesis: pick((r) => r.l, (r) => r.w),
    victim: pick((r) => r.w, (r) => r.l),
  };
}

type Row = {
  id: number;
  name: string;
  matches: number;
  won: number;
  lost: number;
  drawn: number;
};

/** Every opponent met, with the match record against them, most-faced first. */
function summarize(opponents: H2HOpponent[]): Row[] {
  return opponents
    .map((o) => {
      const r = { won: 0, lost: 0, drawn: 0 };
      for (const m of o.matches) {
        if (m.wins > m.losses) r.won += 1;
        else if (m.losses > m.wins) r.lost += 1;
        else r.drawn += 1;
      }
      return {
        id: o.opponent_id,
        name: o.opponent_name,
        matches: o.matches.length,
        ...r,
      };
    })
    .sort((a, b) => b.matches - a.matches || a.name.localeCompare(b.name));
}
