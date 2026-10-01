/**
 * Deck declarations: archetypes from Lega Pauper Italia's list and the fuzzy
 * search players use to find theirs. Shared by the public /mazzo flow and
 * the admin's table walk, so it imports nothing server-only.
 */

export type ManaColor = "W" | "U" | "B" | "R" | "G";

export const MANA_COLORS: ManaColor[] = ["W", "U", "B", "R", "G"];

export type Archetype = {
  id: number;
  name: string;
  /** WUBRG letters from Lega Pauper Italia; may be empty. */
  colors: string[];
};

/** Lega Pauper Italia's catch-all for decks outside the list. */
export const ROGUE = "Rogue";
/** Lega Pauper Italia's marker for a player whose deck is unknown. Admin only. */
export const UNAVAILABLE = "Non Disponibile";

export const COLOR_NAMES: Record<ManaColor, string> = {
  W: "Bianco",
  U: "Blu",
  B: "Nero",
  R: "Rosso",
  G: "Verde",
};

/** Words that name a color or a combination, in English and Italian. */
const COLOR_WORDS: Record<string, ManaColor[]> = {
  white: ["W"], bianco: ["W"], bianca: ["W"],
  blue: ["U"], blu: ["U"],
  black: ["B"], nero: ["B"], nera: ["B"],
  red: ["R"], rosso: ["R"], rossa: ["R"],
  green: ["G"], verde: ["G"],
  azorius: ["W", "U"], dimir: ["U", "B"], rakdos: ["B", "R"], gruul: ["R", "G"], selesnya: ["G", "W"],
  orzhov: ["W", "B"], izzet: ["U", "R"], golgari: ["B", "G"], boros: ["R", "W"], simic: ["G", "U"],
  esper: ["W", "U", "B"], grixis: ["U", "B", "R"], jund: ["B", "R", "G"], naya: ["R", "G", "W"], bant: ["G", "W", "U"],
  abzan: ["W", "B", "G"], jeskai: ["U", "R", "W"], sultai: ["B", "G", "U"], mardu: ["R", "W", "B"], temur: ["G", "U", "R"],
};

/** Nicknames, plurals and Italian words players use for a word in a name. */
const ALIASES: Record<string, string> = {
  elf: "elves", elfs: "elves", elfi: "elves", elfo: "elves",
  fata: "faeries", fate: "faeries", fatine: "faeries", faerie: "faeries", fairies: "faeries",
  affa: "affinity",
  bogle: "bogles", aure: "bogles", aura: "bogles", auras: "bogles",
  muri: "walls", wall: "walls",
  sliver: "slivers",
  goblins: "goblin",
  cani: "dogs",
  emblem: "emblems",
};

/** Words added to an archetype's search text for each of its colors. */
const COLOR_SEARCH: Record<ManaColor, string[]> = {
  W: ["white", "bianco"],
  U: ["blue", "blu"],
  B: ["black", "nero"],
  R: ["red", "rosso"],
  G: ["green", "verde"],
};

function isManaColor(c: string): c is ManaColor {
  return (MANA_COLORS as string[]).includes(c);
}

/**
 * The archetype's colors: Lega Pauper Italia's when given, otherwise read off
 * its name ("Dimir Affinity" is blue-black).
 */
export function colorsOf(a: Archetype): ManaColor[] {
  const given = a.colors.filter(isManaColor);
  if (given.length > 0) return given;
  const found = new Set<ManaColor>();
  for (const word of normalize(a.name).split(" ")) {
    for (const c of COLOR_WORDS[word] ?? []) found.add(c);
  }
  return MANA_COLORS.filter((c) => found.has(c));
}

export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Edit distance with transpositions, giving up past `max`. */
function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    rows.push(Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  }
  for (let i = 1; i <= a.length; i++) {
    let best = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, rows[i - 2][j - 2] + 1);
      rows[i][j] = v;
      best = Math.min(best, v);
    }
    if (best > max) return max + 1;
  }
  return rows[a.length][b.length];
}

/** How well one typed word matches one word of the archetype; 0 is no match. */
function wordScore(typed: string, word: string): number {
  if (word === typed) return 10;
  if (word.startsWith(typed)) return 8;
  if (typed.length >= 3 && word.includes(typed)) return 5;
  if (typed.length >= 4) {
    // Allow a typo per four letters, compared against the word or its start.
    const max = typed.length >= 8 ? 2 : 1;
    const prefix = word.slice(0, typed.length);
    if (distance(typed, word, max) <= max || distance(typed, prefix, max) <= max) return 4;
  }
  return 0;
}

type Indexed = { archetype: Archetype; words: string[]; colors: ManaColor[] };

export function indexArchetypes(list: Archetype[]): Indexed[] {
  return list.map((archetype) => {
    const colors = colorsOf(archetype);
    const words = normalize(archetype.name).split(" ");
    for (const c of colors) words.push(...COLOR_SEARCH[c]);
    if (colors.length === 1) words.push("mono");
    return { archetype, words, colors };
  });
}

/**
 * Archetypes matching the typed text, best first. Every typed word has to
 * match something: a word of the name (with typos tolerated), a color in
 * English or Italian, a guild or shard name, or a run of WUBRG letters such
 * as "ub". An empty query keeps the list in alphabetical order.
 */
export function searchArchetypes(index: Indexed[], query: string, colors: ManaColor[] = []): Archetype[] {
  const typed = normalize(query)
    .split(" ")
    .filter(Boolean)
    .map((t) => ALIASES[t] ?? t);
  const scored: { a: Archetype; score: number }[] = [];
  for (const entry of index) {
    if (!colors.every((c) => entry.colors.includes(c))) continue;
    let score = 0;
    let matched = true;
    for (const t of typed) {
      // "mono" means one color, not a fuzzy "monster".
      if (t === "mono") {
        if (entry.colors.length !== 1) {
          matched = false;
          break;
        }
        score += 9;
        continue;
      }
      // A color or guild word only matches by color or by name, never as a
      // typo of some other word ("nero" is not "heroic").
      const colorWord = t in COLOR_WORDS;
      let best = Math.max(0, ...entry.words.map((w) => (colorWord ? (w === t ? 10 : 0) : wordScore(t, w))));
      const asColors = COLOR_WORDS[t] ?? (/^[wubrg]{1,5}$/.test(t) ? (t.toUpperCase().split("") as ManaColor[]) : null);
      if (asColors && asColors.every((c) => entry.colors.includes(c))) {
        best = Math.max(best, asColors.length === entry.colors.length ? 9 : 6);
      }
      if (best === 0) {
        matched = false;
        break;
      }
      score += best;
    }
    if (matched) scored.push({ a: entry.archetype, score });
  }
  scored.sort((x, y) => y.score - x.score || x.a.name.localeCompare(y.a.name));
  return scored.map((s) => s.a);
}
