/** Points for going undefeated at a tappa: four Swiss rounds, all won. */
export const UNDEFEATED_POINTS = 12;

/**
 * The tappe whose result a player can still improve on, as indexes into
 * `points` (one entry per tappa played so far, in play order, null where the
 * player missed it).
 *
 * Only `counted` results make the season total. Once the league has played
 * that many tappe, every tappa left can replace one of them: the weakest
 * first. A missed tappa counts as 0, so it goes before any result; then the
 * lowest points, the later of two equal ones (ties keep the earlier, as in
 * the total). A result already at the maximum cannot be beaten. Before that
 * many tappe, or with none left, there is nothing to point at.
 */
export function improvable(
  points: (number | null)[],
  counted: number | null,
  remaining: number,
  best = UNDEFEATED_POINTS,
): number[] {
  if (counted === null || remaining <= 0 || points.length < counted) return [];

  const played = points
    .map((p, i) => ({ p, i }))
    .filter((x): x is { p: number; i: number } => x.p !== null)
    // The counted ones: best points first, ties keeping the earlier tappa.
    .sort((a, b) => b.p - a.p || a.i - b.i)
    .slice(0, counted);
  // The slots the player left empty: missed tappe, the earliest first.
  const empty = points
    .map((p, i) => (p === null ? i : -1))
    .filter((i) => i >= 0)
    .slice(0, counted - played.length)
    .map((i) => ({ p: 0, i }));

  const weakestFirst = [...empty, ...played.reverse()];
  return weakestFirst
    .filter((x) => x.p < best)
    .slice(0, Math.min(remaining, counted))
    .map((x) => x.i);
}

/**
 * The most points a player can still add to their season total, by going
 * undefeated at every tappa left: each new result fills a free counted slot,
 * or replaces the worst counted result. counted null means every result counts.
 */
export function maxGain(
  points: (number | null)[],
  counted: number | null,
  remaining: number,
  best = UNDEFEATED_POINTS,
): number {
  const played = points.filter((p): p is number => p !== null);
  // Best first, so the worst counted result is always the last one.
  const kept = [...played].sort((a, b) => b - a).slice(0, counted ?? played.length);
  let gain = 0;
  for (let i = 0; i < remaining; i++) {
    if (counted === null || kept.length < counted) {
      kept.unshift(best);
      gain += best;
      continue;
    }
    const worst = kept[kept.length - 1];
    if (worst === undefined || worst >= best) break;
    kept.pop();
    kept.unshift(best);
    gain += best - worst;
  }
  return gain;
}

/** A place settled for good: inside the top spots, or out of them. */
export type Verdict = "dentro" | "fuori";

/**
 * What is already settled, the way sports tables mark it: certain, never a
 * guess. A player is "fuori" when, even going undefeated at every tappa left
 * while nobody else adds a point, at least `spots` players stay ahead; "dentro"
 * when, even adding nothing while everybody else goes undefeated, fewer than
 * `spots` could reach them. A tie
 * counts against: we cannot know how it would be broken. Someone who has not
 * played yet could still turn up and reach `newcomer` points.
 */
export function verdicts(
  players: { id: number; total: number; ceiling: number }[],
  spots: number,
  newcomer: number,
  remaining: number,
): Map<number, Verdict> {
  const out = new Map<number, Verdict>();
  if (remaining <= 0) return out;
  for (const p of players) {
    const others = players.filter((q) => q.id !== p.id);
    const ahead = others.filter((q) => q.total > p.ceiling).length;
    if (ahead >= spots) {
      out.set(p.id, "fuori");
      continue;
    }
    // Anyone new could reach them: then nothing is certain.
    if (newcomer >= p.total) continue;
    const threats = others.filter((q) => q.ceiling >= p.total).length;
    if (threats < spots) out.set(p.id, "dentro");
  }
  return out;
}
