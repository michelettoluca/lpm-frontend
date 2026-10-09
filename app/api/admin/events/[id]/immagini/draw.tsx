/**
 * The tappa's shareable images, drawn with next/og (Satori): the light theme
 * of the site, on paper, at 1080px wide. Satori lays out with flexbox only:
 * a div holding anything but one string, numbers included, says display: flex.
 */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";
import { MANA_FILL, STAR, manaGlyph, plural, weekday } from "@/app/(sito)/ui";
import { ROGUE, archetypeLabel } from "@/app/lib/decks";
import { CROWN_PATH, CROWN_VIEWBOX } from "@/app/lib/emblem";
import type { Deck, EventData } from "@/app/lib/site";
import { undefeated, type ImageKind } from "./kinds";

/* The light theme's colours, as sito.css sets them. */
const PAPER = "#ffffff";
const INK = "#141a24";
const MUTE = "#556072";
const RED = "#fa1e32";
const LINE = "#e3e7ed";
const SOFT = "#f4f6f9";

const WIDTH = 1080;
const PAD_X = 64;
const PAD_TOP = 56;
const PAD_BOTTOM = 48;
/** The header, the title block and the footer, in pixels; the content adds its own. */
const CHROME = PAD_TOP + 52 + 44 + 124 + 40 + 40 + 2 + 20 + 26 + PAD_BOTTOM;
/** 4:5, the tallest WhatsApp shows whole in the chat; a crowded classifica may run longer. */
const PORTRAIT = 1350;
/** Square, for the imbattuti: a short list, set large. */
const SQUARE = 1080;

/** Rows tall enough to fill the frame, between a floor and a ceiling. */
const fill = (frame: number, rows: number, min: number, max: number) =>
  Math.round(Math.min(max, Math.max(min, (frame - CHROME) / Math.max(1, rows))));

const DISPLAY = { fontFamily: "Archivo", fontWeight: 700, letterSpacing: "-0.03em" } as const;
const STRONG = { fontFamily: "Archivo", fontWeight: 800, letterSpacing: "-0.03em" } as const;
const EYEBROW = {
  color: MUTE,
  fontSize: 17,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  lineHeight: 1.4,
} as const;
/** A single line that stops with an ellipsis where its box ends. */
const CLIP = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 } as const;

type Font = { name: string; data: Buffer; weight: 400 | 600 | 700 | 800; style: "normal" };

let fonts: Promise<Font[]> | null = null;

/** The site's fonts, read once from public/fonts: Satori needs the files, not a stylesheet. */
function loadFonts(): Promise<Font[]> {
  fonts ??= Promise.all(
    (
      [
        ["Archivo", 700],
        ["Archivo", 800],
        ["Figtree", 400],
        ["Figtree", 600],
        ["Figtree", 700],
      ] as const
    ).map(async ([name, weight]) => ({
      name,
      weight,
      style: "normal" as const,
      data: await readFile(join(process.cwd(), "public", "fonts", `${name}-${weight}.ttf`)),
    })),
  );
  return fonts;
}

type Row = EventData["standings"][number];

const rec = (s: Row) => `${s.wins + s.byes}-${s.losses}-${s.draws}`;

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

const [, , CROWN_W, CROWN_H] = CROWN_VIEWBOX.split(" ").map(Number);

/** The header's badge: the crown, white on red. */
function Badge({ size }: { size: number }) {
  const h = Math.round(size * 0.58);
  const w = Math.round((h * CROWN_W) / CROWN_H);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.27),
        background: RED,
      }}
    >
      <svg width={w} height={h} viewBox={CROWN_VIEWBOX} style={{ marginBottom: Math.round(size * 0.04) }}>
        <path fill="#fff" fillRule="evenodd" d={CROWN_PATH} />
      </svg>
    </div>
  );
}

function Mana({ colors, size }: { colors: readonly string[]; size: number }) {
  if (colors.length === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: Math.round(size * 0.22), flexShrink: 0 }}>
      {colors.map((c, i) => (
        <svg key={`${c}-${i}`} viewBox="0 0 24 24" width={size} height={size}>
          <circle cx="12" cy="12" r="12" fill={MANA_FILL[c] ?? "#ddd"} />
          {manaGlyph(c)}
        </svg>
      ))}
    </div>
  );
}

/** The pixel star for 9 points or more. */
function Star({ size }: { size: number }) {
  const w = STAR[0].length;
  return (
    <svg viewBox={`0 0 ${w} ${STAR.length}`} width={size} height={size} style={{ flexShrink: 0 }}>
      {STAR.flatMap((row, y) =>
        [...row].map((c, x) => (c === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={RED} /> : null)),
      )}
    </svg>
  );
}

function DeckLine({ deck, size, color = MUTE }: { deck: Deck; size: number; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: Math.round(size * 0.4), minWidth: 0 }}>
      <Mana colors={deck.colors} size={size} />
      <div style={{ ...CLIP, color, fontSize: size * 1.1, fontWeight: 600, lineHeight: 1.2 }}>{archetypeLabel(deck.name)}</div>
    </div>
  );
}

/** The page every image shares: the league's name, the tappa, a title, the content, and the site's address. */
function Frame({
  e,
  label,
  title,
  meta,
  children,
}: {
  e: EventData;
  label?: string;
  title: string;
  /** The footer's note on the left. */
  meta: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: PAPER,
        color: INK,
        padding: `${PAD_TOP}px ${PAD_X}px ${PAD_BOTTOM}px`,
        fontFamily: "Figtree",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Badge size={52} />
          <div style={{ ...STRONG, fontSize: 28, lineHeight: 1 }}>Lega Pauper Milano</div>
        </div>
        <div style={{ ...EYEBROW, fontSize: 18 }}>{`${weekday(e.event.played_at)} ${e.date}`}</div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 44, height: 124 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {label && <div style={EYEBROW}>{label}</div>}
          <div style={{ ...DISPLAY, fontSize: title.length > 16 ? 62 : 76, letterSpacing: "-0.035em", lineHeight: 1, marginTop: 10 }}>{title}</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexShrink: 0, marginLeft: 32 }}>
          <div style={{ ...EYEBROW, paddingBottom: 12 }}>tappa</div>
          <div style={{ ...STRONG, fontSize: 124, lineHeight: 0.8, color: RED }}>{String(e.number ?? "?")}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, marginTop: 40 }}>{children}</div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 40,
          paddingTop: 20,
          borderTop: `2px solid ${LINE}`,
          color: MUTE,
          fontSize: 19,
          fontWeight: 600,
          lineHeight: 1.3,
        }}
      >
        <div>{meta}</div>
        <div>legapaupermilano.it</div>
      </div>
    </div>
  );
}

const playersAndRounds = (e: EventData) =>
  `${plural(e.standings.length, "giocatore", "giocatori")} · ${plural(e.rounds, "turno", "turni")} di svizzera`;

/* ------------------------------------------------------------------ */
/* The three images                                                    */
/* ------------------------------------------------------------------ */

const COL_HEADS = 30;

/** One column up to a dozen players, two up to 34, three beyond: 17 rows each keep a night of 50 in one image. */
const standingColumns = (e: EventData) => (e.standings.length > 34 ? 3 : e.standings.length > 12 ? 2 : 1);
const standingRows = (e: EventData) => Math.ceil(e.standings.length / standingColumns(e));
const standingRow = (e: EventData) => fill(PORTRAIT - COL_HEADS, standingRows(e), standingColumns(e) > 2 ? 60 : 70, 92);

/** The final standings, in two or three columns past a dozen players. */
function Classifica({ e }: { e: EventData }) {
  const cols = standingColumns(e);
  const per = standingRows(e);
  const row = standingRow(e);
  // Three columns are narrow: the type comes down a step and the dividers close in.
  const tight = cols > 2;
  const gutter = tight ? 20 : 32;
  const columns = Array.from({ length: cols }, (_, c) => e.standings.slice(c * per, (c + 1) * per));
  return (
    <div style={{ display: "flex", gap: 0 }}>
      {columns.map((rows, c) => (
        <div
          key={c}
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minWidth: 0,
            paddingLeft: c ? gutter : 0,
            paddingRight: c < cols - 1 ? gutter : 0,
            borderLeft: c ? `2px solid ${LINE}` : "none",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", ...EYEBROW, fontSize: 14, height: COL_HEADS }}>
            <div>{tight ? "pos. · nome" : "pos. · nome · mazzo"}</div>
            <div>{tight ? "punti" : "punti · v-p-p"}</div>
          </div>
          {rows.map((s, i) => (
            <div
              key={s.player_id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: tight ? 10 : 14,
                height: row,
                borderTop: i ? `1.5px solid ${LINE}` : "none",
              }}
            >
              <div style={{ ...DISPLAY, width: tight ? 36 : 44, fontSize: tight ? 22 : 26, color: s.rank === 1 ? RED : MUTE, flexShrink: 0 }}>
                {String(s.rank)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: 3 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <div style={{ ...CLIP, fontSize: tight ? 20 : 23, fontWeight: 700, lineHeight: 1.15 }}>{s.player_name}</div>
                  {s.prize && <Star size={tight ? 13 : 15} />}
                </div>
                {s.deck && <DeckLine deck={s.deck} size={tight ? 13 : 15} />}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
                <div style={{ ...STRONG, fontSize: tight ? 24 : 27, lineHeight: 1 }}>{String(s.points)}</div>
                <div style={{ color: MUTE, fontSize: tight ? 13 : 15, fontWeight: 600, marginTop: 4, lineHeight: 1 }}>{rec(s)}</div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const classificaHeight = (e: EventData) => CHROME + COL_HEADS + standingRows(e) * standingRow(e);

const barRow = (e: EventData) => fill(PORTRAIT - 44, metagameRows(e).length, 62, 116);
/** The bar's free end, rounded like the page's. */
const ROUND_END = { borderTopRightRadius: 5, borderBottomRightRadius: 5 } as const;

type MetagameRow = {
  key: string;
  name: string;
  colors: readonly string[];
  players: number;
  wins: number;
  losses: number;
  draws: number;
  /** The archetype the night's winner played. */
  won: boolean;
  /** The row that gathers the decks one player each brought. */
  other: boolean;
};

/**
 * The archetypes as rows: those one player each brought, and Rogue, Lega
 * Pauper Italia's catch-all, fold into one "altro" row at the end, as long
 * as something else stands on its own and there is more than one deck to
 * gather.
 */
function metagameRows(e: EventData): MetagameRow[] {
  const all = e.metagame!.archetypes.map<MetagameRow>((a) => ({
    key: String(a.archetype_id),
    name: archetypeLabel(a.name),
    colors: a.colors,
    players: a.players,
    wins: a.wins,
    losses: a.losses,
    draws: a.draws,
    won: a.best_rank === 1,
    other: a.name === ROGUE,
  }));
  const folded = all.filter((r) => r.other || r.players === 1);
  const rest = all.filter((r) => !folded.includes(r));
  if (rest.length === 0 || folded.reduce((n, r) => n + r.players, 0) < 2) return all;
  const named = folded.filter((r) => !r.other).length;
  const other = folded.reduce<MetagameRow>(
    (acc, r) => ({ ...acc, players: acc.players + r.players, wins: acc.wins + r.wins, losses: acc.losses + r.losses, draws: acc.draws + r.draws }),
    { key: "altro", name: named > 0 ? `Altro (${named} archetipi e rogue)` : "Altro (rogue)", colors: [], players: 0, wins: 0, losses: 0, draws: 0, won: false, other: true },
  );
  if (!folded.some((r) => r.name === ROGUE)) other.name = `Altro (${named} archetipi)`;
  return [...rest, other];
}

/** The decks played, as a bar each, the winning deck in red. */
function Mazzi({ e }: { e: EventData }) {
  const rows = metagameRows(e);
  const max = Math.max(1, ...rows.map((r) => r.players));
  const row = barRow(e);
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 18, ...EYEBROW, fontSize: 14, height: 44, paddingBottom: 6 }}>
        <div style={{ width: 360 }}>archetipo</div>
        <div style={{ flex: 1 }}>giocatori</div>
        <div style={{ width: 56 }} />
        <div style={{ display: "flex", justifyContent: "flex-end", width: 90 }}>v-p</div>
      </div>
      {rows.map((r, i) => (
        <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 18, height: row, borderTop: i ? `1.5px solid ${LINE}` : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, width: 360, minWidth: 0 }}>
            <div style={{ ...CLIP, fontSize: 23, fontWeight: 700, color: r.won ? RED : r.other ? MUTE : INK, lineHeight: 1.2 }}>{r.name}</div>
            <Mana colors={r.colors} size={18} />
          </div>
          <div style={{ display: "flex", flex: 1, height: Math.min(24, Math.round(row * 0.26)), background: SOFT, ...ROUND_END }}>
            <div style={{ width: `${Math.max((r.players / max) * 100, 2)}%`, height: "100%", background: r.won ? RED : r.other ? MUTE : INK, ...ROUND_END }} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", width: 56, ...STRONG, fontSize: 26, lineHeight: 1 }}>{String(r.players)}</div>
          <div style={{ display: "flex", justifyContent: "flex-end", width: 90, color: MUTE, fontSize: 17, fontWeight: 600 }}>
            {`${r.wins}-${r.losses}${r.draws ? `-${r.draws}` : ""}`}
          </div>
        </div>
      ))}
    </div>
  );
}

const mazziHeight = (e: EventData) => CHROME + 44 + metagameRows(e).length * barRow(e);

const unbeatenRow = (rows: Row[]) => fill(SQUARE, rows.length, 128, 190);

/** Who closed the night without a loss, deck first; a short list, so set large and centred. */
function Imbattuti({ rows }: { rows: Row[] }) {
  const row = unbeatenRow(rows);
  // The type grows with the row, up to the size two or three rows get.
  const k = Math.min(1, (row - 100) / 90);
  const deckSize = Math.round(46 + 18 * k);
  const nameSize = Math.round(25 + 7 * k);
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flexGrow: 1 }}>
      {rows.map((s, i) => (
        <div
          key={s.player_id}
          style={{ display: "flex", alignItems: "center", gap: 28, height: row, borderTop: i ? `2px solid ${LINE}` : "none" }}
        >
          <div style={{ ...DISPLAY, width: 72, fontSize: deckSize, color: s.rank === 1 ? RED : MUTE, flexShrink: 0 }}>{String(s.rank)}</div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18, minWidth: 0 }}>
              <div style={{ ...CLIP, ...DISPLAY, fontSize: deckSize, lineHeight: 1, color: s.deck ? INK : MUTE }}>
                {s.deck ? archetypeLabel(s.deck.name) : "mazzo sconosciuto"}
              </div>
              {s.deck && <Mana colors={s.deck.colors} size={Math.round(deckSize * 0.66)} />}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: nameSize, fontWeight: 600, color: MUTE, lineHeight: 1.2 }}>
              <div style={CLIP}>{s.player_name}</div>
              <div style={{ flexShrink: 0 }}>{`· ${rec(s)}`}</div>
              {s.prize && <Star size={Math.round(nameSize * 0.7)} />}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
            <div style={{ ...STRONG, fontSize: deckSize, lineHeight: 1 }}>{String(s.points)}</div>
            <div style={{ color: MUTE, fontSize: 18, fontWeight: 600, marginTop: 8, lineHeight: 1 }}>punti</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

/** The image of one kind for a tappa with results, or null when the tappa has nothing to show for it. */
export async function drawImage(e: EventData, kind: ImageKind, file: string): Promise<ImageResponse | null> {
  let body: ReactNode;
  let height: number;
  switch (kind) {
    case "classifica":
      body = (
        <Frame e={e} title="classifica" meta={playersAndRounds(e)}>
          <Classifica e={e} />
        </Frame>
      );
      height = classificaHeight(e);
      break;
    case "mazzi": {
      if (!e.metagame) return null;
      body = (
        <Frame e={e} title="metagame" meta={playersAndRounds(e)}>
          <Mazzi e={e} />
        </Frame>
      );
      height = mazziHeight(e);
      break;
    }
    case "imbattuti": {
      const rows = undefeated(e.standings);
      if (rows.length === 0) return null;
      const meta =
        rows.length === 1
          ? `uno su ${e.standings.length} ha chiuso senza perdere`
          : `${rows.length} su ${e.standings.length} hanno chiuso senza perdere`;
      body = (
        <Frame e={e} title="imbattuti" meta={meta}>
          <Imbattuti rows={rows} />
        </Frame>
      );
      height = Math.max(SQUARE, CHROME + rows.length * unbeatenRow(rows));
      break;
    }
  }
  return new ImageResponse(body, {
    width: WIDTH,
    height: kind === "imbattuti" ? height : Math.max(PORTRAIT, height),
    fonts: await loadFonts(),
    headers: {
      "Content-Disposition": `inline; filename="${file}"`,
      // For the signed-in admin only: never a shared cache.
      "Cache-Control": "private, max-age=60",
    },
  });
}
