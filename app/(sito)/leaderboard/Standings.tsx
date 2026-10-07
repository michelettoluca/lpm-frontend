"use client";

import Link from "next/link";
import { useDeferredValue, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import type { LeaderboardTappa, TappaResult } from "@/app/lib/site";
import { Comune, MarkerCircle } from "../ui";

type Row = {
  rank: number;
  id: number;
  name: string;
  points: number;
  played: number;
  results: (TappaResult | null)[];
  /** Indexes into results: the tappe whose result the tappe left can still improve. */
  improvable: number[];
};

const TOP = 8;

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/* ------------------------------------------------------------------ */
/* Layouts: the same rows with more or fewer columns.                  */
/* ------------------------------------------------------------------ */

const VIEWS = [
  { id: "base", label: "base" },
  { id: "avanzata", label: "avanzata" },
] as const;
type View = (typeof VIEWS)[number]["id"];
const isView = (v: unknown): v is View => VIEWS.some((x) => x.id === v);

/**
 * One grid per layout, so positions, totals and the extra columns line up on
 * every row. In "avanzata" the player stays pinned on the left while the tappe
 * scroll under it; --n is the number of tappa columns.
 */
const COLS: Record<View, string> = {
  base: "grid-cols-[minmax(0,1fr)_2.6rem_2.8rem] gap-x-2 sm:grid-cols-[minmax(0,1fr)_4rem_4rem]",
  avanzata:
    "grid-cols-[minmax(9rem,1fr)_2.6rem_2.8rem_repeat(var(--n),2.4rem)] gap-x-2 sm:grid-cols-[minmax(14rem,1fr)_4rem_4rem_repeat(var(--n),2.8rem)]",
};
/** Pinned cell: opaque, so the scrolled columns pass under it. */
const STICK = "rg-stick sticky left-0 z-[1] flex min-w-0 items-center self-stretch";

/* The visitor's layout, remembered between visits. The server and the first
   client render use "base"; storage can be blocked, so the choice also lives
   in memory for this visit. */
const VIEW_KEY = "lpm-classifica-vista";
let chosen: View | null = null;
const listeners = new Set<() => void>();

function readView(): View {
  if (chosen) return chosen;
  try {
    const v = localStorage.getItem(VIEW_KEY);
    return isView(v) ? v : "base";
  } catch {
    return "base";
  }
}

function writeView(v: View) {
  chosen = v;
  try {
    localStorage.setItem(VIEW_KEY, v);
  } catch {
    // Private mode or blocked storage: the choice still holds for this visit.
  }
  listeners.forEach((l) => l());
}

function useView(): View {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    readView,
    () => "base",
  );
}

type Layout = { view: View; tappe: LeaderboardTappa[] };

function ViewSwitch({
  view,
  counted,
  remaining,
  improving,
}: {
  view: View;
  counted: number | null;
  remaining: number;
  /** Whether any result is marked as still to improve. */
  improving: boolean;
}) {
  const left = remaining === 1 ? "nell'ultima tappa" : `nelle ${remaining} tappe che mancano`;
  const caption: Record<View, string> = {
    base: "Posizione, tappe giocate e punti.",
    avanzata:
      (counted === null
        ? "I punti di ogni tappa, in ordine."
        : `I punti di ogni tappa, in ordine: barrati gli scarti, fuori dalle migliori ${counted}.`) +
      (improving ? ` Cerchiati quelli che si possono ancora migliorare ${left}, tratteggiati se la tappa è saltata.` : ""),
  };
  return (
    <div>
      <div role="group" aria-label="Vista della classifica" className="rg-seg">
        {VIEWS.map((v) => (
          <button key={v.id} type="button" aria-pressed={view === v.id} onClick={() => writeView(v.id)}>
            {v.label}
          </button>
        ))}
      </div>
      <p className="rg-muted mt-2 text-[14px] leading-snug" aria-live="polite">
        {caption[view]}
      </p>
    </div>
  );
}

function Head({ view, tappe }: Layout) {
  return (
    <div aria-hidden="true" className={`rg-colheads grid px-2 ${COLS[view]}`}>
      <span className={STICK}>
        <span className="w-[2.2rem] shrink-0 sm:w-[3rem]">pos.</span>
        nome
      </span>
      <span className="text-right">tappe</span>
      <span className="text-right">punti</span>
      {view === "avanzata" &&
        tappe.map((t, i) => (
          <span key={t.id} title={t.title} className="flex justify-end">
            <span className="w-7 text-center">t{t.number ?? i + 1}</span>
          </span>
        ))}
    </div>
  );
}

/**
 * Every tappa's result sits in the same round box at the right of its column,
 * circled or not, so the numbers line up down the column.
 */
const BOX = "inline-flex h-7 w-7 items-center justify-center rounded-full text-[15px]";
/**
 * A result the tappe left can still improve: circled in a quiet grey, dashed
 * when the tappa was missed. A hint, not news: it should not look like a warning.
 */
const IMPROVE = "outline-[1.5px] -outline-offset-1 outline-[var(--rg-line-strong)]";

function Cell({ children }: { children: ReactNode }) {
  return <span className="flex justify-end">{children}</span>;
}

function Results({ r, tappe }: { r: Row; tappe: LeaderboardTappa[] }) {
  const improve = new Set(r.improvable);
  return r.results.map((res, i) => (
    <Cell key={tappe[i].id}>
      {res === null ? (
        improve.has(i) ? (
          <span title="saltata: si può ancora recuperare" className={`${BOX} ${IMPROVE} rg-muted outline-dashed`}>
            –
          </span>
        ) : (
          <span aria-hidden="true" className={`${BOX} rg-muted opacity-50`}>
            –
          </span>
        )
      ) : !res.counted ? (
        <s title="scartata: fuori dalle migliori" className={`${BOX} rg-muted tnum decoration-1`}>
          {res.points}
        </s>
      ) : improve.has(i) ? (
        <span title="si può ancora migliorare" className={`${BOX} ${IMPROVE} tnum outline-solid`}>
          {res.points}
        </span>
      ) : (
        <span className={`${BOX} tnum`}>{res.points}</span>
      )}
    </Cell>
  ));
}

function ListRow({ r, size, view, tappe }: { r: Row; size: "md" | "sm" } & Layout) {
  const md = size === "md";
  return (
    <Link href={`/players/${r.id}`} className={`rg-row grid items-center px-2 ${md ? "min-h-14" : "min-h-12"} ${COLS[view]}`}>
      <span className={STICK}>
        <span
          className={`tnum w-[2.2rem] shrink-0 sm:w-[3rem] ${
            md ? `rg-display text-[22px] ${r.rank === 1 ? "text-[var(--rg-o)]" : ""}` : "rg-muted text-[15px] font-semibold"
          }`}
        >
          {r.rank}
        </span>
        {/* With the tappe, capped on a phone so the total stays in view before any scrolling. */}
        <span
          className={`truncate ${view === "avanzata" ? "max-w-[9.5rem] sm:max-w-none" : ""} ${
            // Smaller on a phone when extra columns share the row.
            md ? `rg-display sm:text-[20px] ${view === "base" ? "text-[19px]" : "text-[17px]"}` : "text-[16px] font-semibold"
          }`}
        >
          {r.name}
        </span>
      </span>
      <span className="rg-muted tnum text-right text-[15px]">{r.played}</span>
      <span className={`rg-display rg-strong tnum text-right ${md ? "text-[22px]" : "text-[18px]"}`}>{r.points}</span>
      {view === "avanzata" && <Results r={r} tappe={tappe} />}
    </Link>
  );
}

function Rows({ rows, size, ...layout }: { rows: Row[]; size: "md" | "sm" } & Layout) {
  return (
    <ol>
      {rows.map((r, i) => (
        <li key={r.id} className={i ? "rg-hr" : ""}>
          <ListRow r={r} size={size} {...layout} />
        </li>
      ))}
    </ol>
  );
}

/** Scrolls sideways as one block, so header, rows and the top 8 line move together. */
function Table({ view, tappe, children }: Layout & { children: ReactNode }) {
  return (
    <div className="rg-scroll @container -mx-2 overflow-x-auto" style={{ "--n": Math.max(tappe.length, 1) } as CSSProperties}>
      <div className={view === "avanzata" ? "w-max min-w-full" : "w-full"}>
        <Head view={view} tappe={tappe} />
        {children}
      </div>
    </div>
  );
}

export function Standings({
  rows,
  tappe,
  counted,
  remaining,
}: {
  rows: Row[];
  tappe: LeaderboardTappa[];
  counted: number | null;
  remaining: number;
}) {
  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim());
  const found = query ? rows.filter((r) => norm(r.name).includes(norm(query))) : rows;
  const view = useView();
  const layout = { view, tappe };
  const switcher = (
    <ViewSwitch
      view={view}
      counted={counted}
      remaining={remaining}
      improving={rows.some((r) => r.improvable.length > 0)}
    />
  );

  const [first] = rows;
  // Every player is in the table, the leader too, so all results sit together.
  const zone = rows.slice(0, TOP);
  const others = rows.slice(TOP);

  return (
    <div className="min-w-0">
      <label htmlFor="rg-search" className="rg-eyebrow block">
        cerchi qualcuno?
      </label>
      <input
        id="rg-search"
        type="search"
        autoComplete="off"
        placeholder="scrivi un nome"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="rg-input mt-2"
      />
      <p className="sr-only" aria-live="polite">
        {query ? `${found.length} risultati` : ""}
      </p>

      {query ? (
        found.length === 0 ? (
          <div className="mt-10 flex flex-col items-start gap-4">
            <Comune pose="lost" className="h-[110px] w-[110px]" />
            <p className="rg-display text-[24px] leading-tight">
              Nessuno si chiama così. Forse è rimasto in sideboard.
            </p>
          </div>
        ) : (
          <div className="mt-8">
            {switcher}
            <div className="mt-6">
              <Table {...layout}>
                <Rows rows={found} size="sm" {...layout} />
              </Table>
            </div>
          </div>
        )
      ) : (
        <>
          {first && (
            <Link
              href={`/players/${first.id}`}
              className="rg-row -mx-2 mt-8 grid grid-cols-[auto_1fr_auto] items-end gap-x-4 px-2 py-3"
            >
              <span className="rg-display tnum text-[88px] leading-[0.78] text-[var(--rg-o)] lg:text-[120px]">1</span>
              <span className="min-w-0 pb-0.5">
                <span className="rg-eyebrow block">in testa</span>
                <span className="relative mt-3 inline-block px-1">
                  <span className="rg-display block text-[26px] leading-[1.05] sm:text-[32px] lg:text-[46px]">{first.name}</span>
                  <MarkerCircle className="-top-3 -left-3 h-[calc(100%+24px)] w-[calc(100%+26px)]" />
                </span>
                <span className="rg-muted mt-2 block text-[14px] tnum">{first.played} tappe</span>
              </span>
              <span className="pb-0.5 text-right">
                <span className="rg-display tnum block text-[36px] leading-none lg:text-[52px]">{first.points}</span>
                <span className="rg-muted block text-[13px] font-semibold">punti</span>
              </span>
            </Link>
          )}
          {zone.length > 0 && (
            <div className="mt-8">
              {switcher}
              <div className="mt-6">
                <Table {...layout}>
                  <Rows rows={zone} size="md" {...layout} />
                  {others.length > 0 && (
                    <>
                      {/* As wide as the visible table, pinned, so the line never scrolls away. */}
                      <div
                        className="sticky left-0 flex w-[100cqw] items-center gap-3 px-2 py-3"
                        role="separator"
                        aria-label="Fine della zona top 8"
                      >
                        <span aria-hidden="true" className="rg-rule-o flex-1" />
                        <span aria-hidden="true" className="rg-badge rg-badge-o shrink-0">
                          ↑ top 8, per ora
                        </span>
                      </div>
                      <Rows rows={others} size="sm" {...layout} />
                    </>
                  )}
                </Table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
