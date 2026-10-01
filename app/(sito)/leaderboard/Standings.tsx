"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { ColHeads, Comune, MarkerCircle } from "../ui";

type Row = { rank: number; id: number; name: string; points: number; played: number };

const TOP = 8;

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** One grid for every list row, so positions, tappe and punti line up. */
const COLS = "grid-cols-[2.2rem_1fr_2.6rem_2.8rem] gap-2 sm:grid-cols-[3rem_1fr_4.5rem_4.5rem]";
const HEADS = [{ label: "pos." }, { label: "nome" }, { label: "tappe", right: true }, { label: "punti", right: true }];

function ListRow({ r, size }: { r: Row; size: "md" | "sm" }) {
  const md = size === "md";
  return (
    <Link
      href={`/players/${r.id}`}
      className={`rg-row -mx-2 grid items-center px-2 ${md ? "min-h-14" : "min-h-12"} ${COLS}`}
    >
      <span className={`tnum ${md ? "rg-display text-[22px]" : "rg-muted text-[15px] font-semibold"}`}>{r.rank}</span>
      <span className={`truncate ${md ? "rg-display text-[19px] sm:text-[20px]" : "text-[16px] font-semibold"}`}>{r.name}</span>
      <span className="rg-muted tnum text-right text-[15px]">{r.played}</span>
      <span className={`rg-display rg-strong tnum text-right ${md ? "text-[22px]" : "text-[18px]"}`}>{r.points}</span>
    </Link>
  );
}

function Rows({ rows, size }: { rows: Row[]; size: "md" | "sm" }) {
  return (
    <ol>
      {rows.map((r, i) => (
        <li key={r.id} className={i ? "rg-hr" : ""}>
          <ListRow r={r} size={size} />
        </li>
      ))}
    </ol>
  );
}

export function Standings({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const query = useDeferredValue(q.trim());
  const found = query ? rows.filter((r) => norm(r.name).includes(norm(query))) : rows;

  const [first, ...rest] = rows;
  const podium = rest.slice(0, 2);
  const zone = rows.slice(3, TOP);
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
            <ColHeads className={COLS} cols={HEADS} />
            <Rows rows={found} size="sm" />
          </div>
        )
      ) : (
        <ol className="mt-8">
          {first && (
            <li>
              <Link
                href={`/players/${first.id}`}
                className="rg-row -mx-2 grid grid-cols-[auto_1fr_auto] items-end gap-x-4 px-2 py-3"
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
            </li>
          )}
          {podium.map((r) => (
            <li key={r.id} className="rg-hr mt-2">
              <Link
                href={`/players/${r.id}`}
                className="rg-row -mx-2 grid grid-cols-[2.2rem_1fr_auto] items-center gap-x-2 px-2 py-4 sm:grid-cols-[3rem_1fr_auto]"
              >
                <span className="rg-display tnum text-[52px] leading-[0.85] lg:text-[64px]">{r.rank}</span>
                <span className="min-w-0">
                  <span className="rg-display block text-[22px] leading-[1.1] lg:text-[30px]">{r.name}</span>
                  <span className="rg-muted mt-0.5 block text-[14px] tnum">{r.played} tappe</span>
                </span>
                <span className="text-right">
                  <span className="rg-display tnum block text-[28px] leading-none lg:text-[36px]">{r.points}</span>
                  <span className="rg-muted block text-[13px] font-semibold">punti</span>
                </span>
              </Link>
            </li>
          ))}
          {zone.length > 0 && (
            <li className="mt-6">
              <ColHeads className={COLS} cols={HEADS} />
              <Rows rows={zone} size="md" />
            </li>
          )}
          {others.length > 0 && (
            <li>
              <div className="flex items-center gap-3 py-3" role="separator" aria-label="Fine della zona top 8">
                <span aria-hidden="true" className="h-[2px] flex-1 rounded-full bg-[var(--rg-o)]" />
                <span aria-hidden="true" className="rg-badge rg-badge-o shrink-0">
                  ↑ top 8, per ora
                </span>
              </div>
              <Rows rows={others} size="sm" />
            </li>
          )}
        </ol>
      )}
    </div>
  );
}
