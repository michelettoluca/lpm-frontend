/** Points for going undefeated at a tappa: four Swiss rounds, all won. */
export const UNDEFEATED_POINTS = 12;

/**
 * How many points a player can still add to their season total by going
 * undefeated at every tappa left: each new result fills a free counted slot,
 * or replaces their worst counted result, which then becomes a discard.
 * counted null means every result counts.
 */
export function potentialGain(
  points: number[],
  counted: number | null,
  remaining: number,
  best = UNDEFEATED_POINTS,
): number {
  // Best first, so the worst counted result is always the last one.
  const kept = [...points].sort((a, b) => b - a).slice(0, counted ?? points.length);
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
