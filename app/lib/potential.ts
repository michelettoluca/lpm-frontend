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
