import type { MatchRecord, MatchupMatrix } from "@/app/lib/site";
import { Mana } from "./ui";

type Archetype = MatchupMatrix["archetypes"][number];
type Cell = MatchupMatrix["cells"][number];

/** Favourable and unfavourable poles of the scale, and its neutral middle. */
const GOOD = "#1f9d55";
const BAD = "#e34948";
const EVEN = "#f0efec";
/** The grid between cells. */
const LINE = "border-[var(--rg-line-strong)]";
/** Every cell the same size, wide enough for a record, a rate and a count. */
const BOX = "h-[5.25rem] w-[6.5rem] min-w-[6.5rem]";
/** Archetype names in the headings, row and column alike. */
const NAME = "text-[12px] font-bold uppercase leading-tight tracking-[0.03em]";

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

const percent = (x: number) => Math.round(x * 100);
const record = (r: MatchRecord) => `${r.wins}-${r.losses}-${r.draws}`;
const describe = (r: MatchRecord) => `${record(r)} nei match, ${percent(r.wins / played(r))}% di vittorie`;

/** A rate as the cell shows it: won-lost-drawn above, the rate large, the count below. */
function Rate({ r, bold = false }: { r: MatchRecord; bold?: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{ background: fill(r.wins / played(r)) }}
      className={`tnum flex flex-col items-center justify-center text-[var(--rg-ink)] ${BOX}`}
    >
      <span className="text-[11px] opacity-70">{record(r)}</span>
      <span className={`my-1 text-[22px] leading-none ${bold ? "font-extrabold" : "font-bold"}`}>
        {percent(r.wins / played(r))}
        <span className="text-[13px]">%</span>
      </span>
      <span className="text-[11px] opacity-75">{played(r)} match</span>
    </span>
  );
}

const Empty = () => (
  <span aria-hidden="true" className={`rg-muted flex items-center justify-center ${BOX}`}>
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
  const td = `border-b border-r ${LINE} p-0`;

  return (
    <div>
      <div className="overflow-x-auto pb-2">
        <table
          className="border-separate border-spacing-0 text-[13px] [&_tbody_tr:first-child>*]:border-t"
          aria-label={label}
        >
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-[var(--rg-paper)]" />
              <th scope="col" className={`w-[6.5rem] min-w-[6.5rem] px-1 pb-2 align-bottom ${NAME}`}>
                totale
              </th>
              {columns.map((c) => (
                <th key={c.id} scope="col" className="w-[6.5rem] min-w-[6.5rem] px-1.5 pb-2 align-bottom">
                  {/* The colours stand in for a picture of the deck, the name right above the numbers. */}
                  <span className="mb-1.5 flex h-3.5 justify-center">
                    <Mana colors={c.colors} size={14} />
                  </span>
                  {/* Two lines kept for every name, so the colours line up across the header. */}
                  <span className="flex h-[2.5em] items-end justify-center text-[12px]">
                    <span className={`line-clamp-2 ${NAME}`}>{c.name}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const total = sum(
                cells.filter((c) => c.archetype_id === r.id && !(mirror && c.opponent_archetype_id === r.id)),
              );
              return (
                <tr key={r.id}>
                  <th
                    scope="row"
                    className={`sticky left-0 z-20 w-[8.5rem] min-w-[8.5rem] border-b border-r ${LINE} bg-[var(--rg-paper)] py-2 pr-3 pl-2 text-right align-middle sm:w-[11rem] sm:min-w-[11rem]`}
                  >
                    {/* Against the numbers, so the eye goes straight from the name to its row. */}
                    <span className={`line-clamp-2 block ${NAME}`}>{r.name}</span>
                    <span className="mt-1.5 flex h-3.5 justify-end">
                      <Mana colors={r.colors} size={14} />
                    </span>
                  </th>
                  {/* The total, set off from the matchups by a double-width rule. */}
                  <td
                    className={`border-b border-r-2 ${LINE} p-0`}
                    aria-label={played(total) ? `in totale: ${describe(total)}` : "in totale: nessun match"}
                  >
                    {played(total) ? <Rate r={total} bold /> : <Empty />}
                  </td>
                  {columns.map((c) => {
                    const cell = byPair.get(`${r.id}-${c.id}`);
                    if (mirror && cell && r.id === c.id) {
                      return (
                        <td key={c.id} className={td} aria-label={`${cell.matches} mirror`}>
                          <span
                            aria-hidden="true"
                            className={`rg-muted tnum flex flex-col items-center justify-center bg-[var(--rg-soft-2)] ${BOX}`}
                          >
                            <span className="text-[22px] font-bold leading-none">{cell.matches}</span>
                            <span className="mt-1 text-[11px]">mirror</span>
                          </span>
                        </td>
                      );
                    }
                    return (
                      <td
                        key={c.id}
                        className={td}
                        aria-label={cell && played(cell) ? `contro ${c.name}: ${describe(cell)}` : `contro ${c.name}: mai`}
                      >
                        {cell && played(cell) ? <Rate r={cell} /> : <Empty />}
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
