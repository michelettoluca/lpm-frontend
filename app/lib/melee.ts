/** "475829" or "https://melee.gg/Tournament/View/475829" → 475829; anything else → null. */
export function meleeTournamentId(text: string): number | null {
  const t = text.trim();
  const m = /^(\d+)$/.exec(t) ?? /\/Tournament\/View\/(\d+)/i.exec(t);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function meleeTournamentUrl(id: number) {
  return `https://melee.gg/Tournament/View/${id}`;
}
