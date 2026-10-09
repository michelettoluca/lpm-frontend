import { createHash } from "node:crypto";
import type { EventData } from "@/app/lib/site";

/**
 * The PNGs already drawn, in memory: drawing takes a good second on the
 * server, and a tappa's results rarely change once imported. The key carries
 * a fingerprint of what the image shows, so a corrected deck draws it anew
 * and the stale one simply ages out.
 */
const MAX = 48;
const store = new Map<string, Buffer>();

/** What the images are drawn from: the standings with their decks, and the archetype counts. */
export function fingerprint(e: EventData): string {
  const data = {
    name: e.event.name,
    date: e.event.played_at,
    rounds: e.rounds,
    standings: e.standings.map((s) => [s.player_id, s.player_name, s.rank, s.points, s.wins, s.losses, s.draws, s.byes, s.deck?.id ?? null, s.deck?.name ?? null, s.deck?.colors ?? null]),
    metagame: e.metagame,
  };
  return createHash("sha1").update(JSON.stringify(data)).digest("hex");
}

export function cached(key: string): Buffer | undefined {
  const png = store.get(key);
  if (png) {
    // Freshly used goes to the back, so the oldest unused is the first to go.
    store.delete(key);
    store.set(key, png);
  }
  return png;
}

export function remember(key: string, png: Buffer): void {
  store.set(key, png);
  while (store.size > MAX) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}
