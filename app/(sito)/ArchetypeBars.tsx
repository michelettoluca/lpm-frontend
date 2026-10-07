import { archetypeLabel } from "@/app/lib/decks";
import { Mana } from "./ui";

/** On phones the name takes its own line above the bar; from sm up it is the first column. */
const COLS = "grid-cols-[1fr_1.5rem] gap-x-2 sm:grid-cols-[minmax(0,15rem)_1fr_1.5rem] sm:gap-x-3";

export type BarRow = {
  id: number;
  name: string;
  colors: string[];
  /** The bar's length, against the largest. */
  count: number;
  /** The one to pick out in red, such as the deck that won the night. */
  hot?: boolean;
  /** The whole row in words, for screen readers. */
  said: string;
};

/** Archetypes as a bar each, longest first: how often they were played. The matrix below has the results. */
export function ArchetypeBars({ rows, countLabel }: { rows: BarRow[]; countLabel: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <>
      <div aria-hidden="true" className={`rg-colheads grid items-end ${COLS}`}>
        <span className="hidden sm:block">archetipo</span>
        <span className="col-span-2">{countLabel}</span>
      </div>
      <ol>
        {rows.map((r, i) => (
          <li key={r.id} className={i ? "rg-hr" : ""}>
            <div className={`rg-row -mx-2 grid items-center gap-y-1 px-2 py-2 ${COLS}`}>
              <span className="sr-only">{r.said}</span>
              <span
                aria-hidden="true"
                className="col-span-2 flex min-w-0 items-center gap-1.5 text-[15px] font-semibold sm:col-span-1"
              >
                <span className={`truncate ${r.hot ? "text-[var(--rg-link)]" : ""}`}>{archetypeLabel(r.name)}</span>
                <Mana colors={r.colors} size={14} />
              </span>
              <span aria-hidden="true" className="block h-2 min-w-0">
                <span
                  className="block h-full rounded-r-[4px]"
                  style={{
                    width: `${Math.max((r.count / max) * 100, 2)}%`,
                    background: r.hot ? "var(--rg-o)" : "var(--rg-ink)",
                  }}
                />
              </span>
              <span aria-hidden="true" className="rg-display rg-strong tnum text-right text-[16px] leading-none">
                {r.count}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
