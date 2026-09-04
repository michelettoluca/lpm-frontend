const TZ = "Europe/Rome";
const MONTHS = [
  "gen", "feb", "mar", "apr", "mag", "giu",
  "lug", "ago", "set", "ott", "nov", "dic",
];

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** "… - Tappa 6" → 6 */
export function tappaNumber(name: string): number | null {
  const m = name.match(/Tappa\s+(\d+)/i);
  return m ? Number(m[1]) : null;
}

/** "… - Tappa 6" → "Tappa 6" */
export function tappaTitle(name: string): string {
  const n = tappaNumber(name);
  return n === null ? name : `Tappa ${n}`;
}

/** "Lega Pauper Milano road to Geddon Summer Edition - Tappa 6" → "Road to Geddon Summer Edition" */
export function tappaSubtitle(name: string): string {
  const s = name
    .replace(/^\s*Lega Pauper Milano\s*/i, "")
    .replace(/\s*[-–·]\s*Tappa\s+\d+\s*$/i, "")
    .trim();
  if (!s) return "Lega Pauper Milano";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function romeParts(iso: string) {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("it-IT", {
    timeZone: TZ,
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(d);
  const pick = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { day: pick("day"), month: pick("month"), year: pick("year") };
}

/** Day + 3-letter Italian month for date tiles. */
export function dateTile(iso: string): { day: string; mon: string } {
  const { day, month } = romeParts(iso);
  return { day: String(day), mon: MONTHS[month - 1] ?? "" };
}

/** "12 set 2026" */
export function formatDateMeta(iso: string): string {
  const { day, month, year } = romeParts(iso);
  return `${day} ${MONTHS[month - 1] ?? ""} ${year}`;
}

export function eventYear(iso: string): number {
  return romeParts(iso).year;
}

export type EventStatus = "conclusa" | "in corso" | "prossima";

export function eventStatus(iso: string, now = new Date()): EventStatus {
  const a = romeParts(iso);
  const b = romeParts(now.toISOString());
  if (a.year === b.year && a.month === b.month && a.day === b.day) {
    return "in corso";
  }
  return new Date(iso).getTime() > now.getTime() ? "prossima" : "conclusa";
}

export function isPlayed(iso: string, now = new Date()): boolean {
  return eventStatus(iso, now) !== "prossima";
}

export function record(w: number, l: number, d: number): string {
  return `${w}-${l}-${d}`;
}

export function winPct(w: number, l: number, d: number): string {
  const total = w + l + d;
  return total === 0 ? "–" : `${Math.round((w / total) * 100)}%`;
}

export function splitName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return { first: name.trim(), last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}
