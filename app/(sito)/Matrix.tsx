import type { MatchRecord, MatchupMatrix } from "@/app/lib/site";
import { archetypeLabel } from "@/app/lib/decks";
import { Mana } from "./ui";

type Archetype = MatchupMatrix["archetypes"][number];
type Cell = MatchupMatrix["cells"][number];

/** Favourable and unfavourable poles of the scale, and its neutral middle. */
const GOOD = "#1f9d55";
const BAD = "#e34948";
const EVEN = "#f0efec";
/** The rules between the names in the first column. */
const LINE = "border-[var(--rg-line)]";
/**
 * A cell's content fills its cell, however tall the row grows; the column
 * headings set the widths, the same for all.
 */
const BOX = "absolute inset-0";
/** Every cell: its row at least this tall, room for a two-line name and its colours. */
const CELL = "relative h-16 p-0 sm:h-[5.25rem]";
/** The names' column and every other one, tighter on phones. */
const WIDTHS = "[--name:6rem] [--col:4rem] sm:[--name:11rem] sm:[--col:6.5rem]";
/** A column's heading: it sets the width, and snaps to the left edge, past the names. */
const COL = "w-[var(--col)] snap-start scroll-ml-[var(--name)]";
/** Archetype names in the headings, row and column alike. */
const NAME = "text-[11px] font-bold uppercase leading-tight tracking-[0.03em] sm:text-[12px]";

const played = (r: MatchRecord) => r.wins + r.losses + r.draws;

function sum(records: MatchRecord[]): MatchRecord {
  const out: MatchRecord = { matches: 0, wins: 0, losses: 0, draws: 0, games_won: 0, games_lost: 0, games_drawn: 0 };
  for (const r of records) {
    out.matches += r.matches;
    out.wins += r.wins;
    out.losses += r.losses;
    out.draws += r.draws;
    out.games_won += r.games_won;
    out.games_lost += r.games_lost;
    out.games_drawn += r.games_drawn;
  }
  return out;
}

/** The cell's fill: green when favourable, red when not, paler the closer to even. */
function fill(rate: number) {
  const strength = Math.min(1, Math.abs(rate - 0.5) * 2);
  return `color-mix(in oklab, ${rate >= 0.5 ? GOOD : BAD} ${Math.round(strength * 58)}%, ${EVEN})`;
}

/** A shade darker than a cell's fill, for its edge. */
const shade = (background: string) => `color-mix(in oklab, ${background}, #000 12%)`;

/** Which outer sides a cell closes: the last column its right, the last row its bottom. */
type Sides = { right: boolean; bottom: boolean };

/**
 * A cell's edge in its own colour. Every cell draws only its left and top,
 * so two neighbours share one line; the last column and row close the outside.
 */
function edges(color: string, { right, bottom }: Sides) {
  return [
    `inset 1px 1px 0 0 ${color}`,
    right && `inset -1px 0 0 0 ${color}`,
    bottom && `inset 0 -1px 0 0 ${color}`,
  ]
    .filter(Boolean)
    .join(", ");
}

const percent = (x: number) => Math.round(x * 100);
const record = (r: MatchRecord) => `${r.wins}-${r.losses}-${r.draws}`;
const describe = (r: MatchRecord) => `${record(r)} nei match, ${percent(r.wins / played(r))}% di vittorie`;

/** A rate as the cell shows it: won-lost-drawn above, the rate large, the count below. */
function Rate({ r, sides, bold = false }: { r: MatchRecord; sides: Sides; bold?: boolean }) {
  const background = fill(r.wins / played(r));
  return (
    <span
      aria-hidden="true"
      style={{ background, boxShadow: edges(shade(background), sides) }}
      className={`tnum flex flex-col items-center justify-center text-[var(--rg-ink)] ${BOX}`}
    >
      <span className="text-[10px] opacity-70 sm:text-[11px]">{record(r)}</span>
      <span className={`my-0.5 text-[17px] leading-none sm:my-1 sm:text-[22px] ${bold ? "font-extrabold" : "font-bold"}`}>
        {percent(r.wins / played(r))}
        <span className="text-[11px] sm:text-[13px]">%</span>
      </span>
      <span className="text-[10px] opacity-75 sm:text-[11px]">{played(r)} match</span>
    </span>
  );
}

const Empty = ({ sides }: { sides: Sides }) => (
  <span
    aria-hidden="true"
    style={{ boxShadow: edges("var(--rg-line)", sides) }}
    className={`rg-muted flex items-center justify-center ${BOX}`}
  >
    –
  </span>
);

/**
 * A matchup matrix: each row an archetype, each column the one it faced,
 * each cell the row's matches won-lost-drawn, its win rate and how many it
 * rests on. A dash where the two never met. Rows and columns come most
 * played first.
 *
 * The total comes first. With `mirror` the diagonal holds mirror matches,
 * which say nothing about the deck: it shows how many there were, and the
 * totals leave them out.
 */
export function Matrix({
  rows,
  columns,
  cells,
  mirror,
  label,
}: {
  rows: Archetype[];
  columns: Archetype[];
  cells: Cell[];
  mirror: boolean;
  /** What the matrix is, for screen readers. */
  label: string;
}) {
  const byPair = new Map(cells.map((c) => [`${c.archetype_id}-${c.opponent_archetype_id}`, c]));
  // No gap between data cells: each draws its own edge.
  const td = CELL;

  return (
    <div>
      {/* On phones the matrix runs to the panel's edges and scrolling stops on a whole column. */}
      <div className="-mx-5 snap-x snap-proximity overflow-x-auto pb-2 sm:mx-0">
        <table
          className={`table-fixed border-separate border-spacing-0 text-[13px] ${WIDTHS}`}
          // A fixed layout needs the table's width: the names, the total and the matchups.
          style={{ width: `calc(var(--name) + ${columns.length + 1} * var(--col))` }}
          aria-label={label}
        >
          <thead>
            <tr>
              <th className="sticky left-0 z-20 w-[var(--name)] bg-[var(--rg-paper)]" />
              {/* Grey rules between the column names, like the ones between the row names. */}
              <th scope="col" className={`${COL} border-l ${LINE} px-1 pb-2 align-bottom ${NAME}`}>
                totale
              </th>
              {columns.map((c, ci) => (
                <th
                  key={c.id}
                  scope="col"
                  className={`${COL} border-l ${ci === columns.length - 1 ? "border-r" : ""} ${LINE} px-0.5 pb-2 align-bottom sm:px-1.5`}
                >
                  {/* The colours stand in for a picture of the deck, the name right above the numbers. */}
                  <span className="mb-1.5 flex h-3.5 justify-center">
                    <Mana colors={c.colors} size={14} />
                  </span>
                  {/* The same lines kept for every name (three on phones), so the colours line up across the header. */}
                  <span className="flex h-[3.9em] items-end justify-center text-[10px] sm:h-[2.6em] sm:text-[12px]">
                    <span
                      className={`line-clamp-3 hyphens-auto [overflow-wrap:anywhere] sm:line-clamp-2 ${NAME} max-sm:text-[10px] max-sm:tracking-normal`}
                    >
                      {archetypeLabel(c.name)}
                    </span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => {
              const bottom = ri === rows.length - 1;
              const total = sum(
                cells.filter((c) => c.archetype_id === r.id && !(mirror && c.opponent_archetype_id === r.id)),
              );
              return (
                <tr key={r.id}>
                  <th
                    scope="row"
                    className={`sticky left-0 z-20 border-t ${bottom ? "border-b" : ""} ${LINE} bg-[var(--rg-paper)] py-2 pr-2 pl-1 text-right align-middle sm:pr-3 sm:pl-2`}
                  >
                    {/* Against the numbers, so the eye goes straight from the name to its row. The rule
                        above it lines up with the cells' top edges; the last one closes below too. */}
                    <span className={`line-clamp-2 block [overflow-wrap:anywhere] ${NAME}`}>{archetypeLabel(r.name)}</span>
                    <span className="mt-1.5 flex h-3.5 justify-end">
                      <Mana colors={r.colors} size={14} />
                    </span>
                  </th>
                  {/* The total, first. */}
                  <td
                    className={td}
                    aria-label={played(total) ? `in totale: ${describe(total)}` : "in totale: nessun match"}
                  >
                    {played(total) ? (
                      <Rate r={total} sides={{ right: columns.length === 0, bottom }} bold />
                    ) : (
                      <Empty sides={{ right: columns.length === 0, bottom }} />
                    )}
                  </td>
                  {columns.map((c, ci) => {
                    const cell = byPair.get(`${r.id}-${c.id}`);
                    const sides = { right: ci === columns.length - 1, bottom };
                    if (mirror && cell && r.id === c.id) {
                      return (
                        <td key={c.id} className={td} aria-label={`${cell.matches} mirror`}>
                          <span
                            aria-hidden="true"
                            style={{ boxShadow: edges(shade("var(--rg-soft-2)"), sides) }}
                            className={`rg-muted tnum flex flex-col items-center justify-center bg-[var(--rg-soft-2)] ${BOX}`}
                          >
                            <span className="text-[17px] font-bold leading-none sm:text-[22px]">{cell.matches}</span>
                            <span className="mt-1 text-[10px] sm:text-[11px]">mirror</span>
                          </span>
                        </td>
                      );
                    }
                    return (
                      <td
                        key={c.id}
                        className={td}
                        aria-label={cell && played(cell) ? `contro ${archetypeLabel(c.name)}: ${describe(cell)}` : `contro ${archetypeLabel(c.name)}: mai`}
                      >
                        {cell && played(cell) ? <Rate r={cell} sides={sides} /> : <Empty sides={sides} />}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
        <span className="flex items-center gap-2">
          <span className="rg-muted">sfavorevole</span>
          <span
            aria-hidden="true"
            className="block h-2.5 w-28 rounded-full"
            style={{ background: `linear-gradient(90deg, ${fill(0)}, ${EVEN}, ${fill(1)})` }}
          />
          <span className="rg-muted">favorevole</span>
        </span>
        {mirror && <span className="rg-muted">Sulla diagonale i mirror.</span>}
      </div>
    </div>
  );
}
