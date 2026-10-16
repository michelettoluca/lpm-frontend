"use client";

import Link from "next/link";
import { useState } from "react";
import { paroleIn, type Lingua } from "../../parole";

type H2H = { id: number; name: string; matches: number; won: number; lost: number; drawn: number };

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export function FaceOff({
  me,
  others,
  rows,
  lang,
}: {
  me: string;
  others: { id: number; name: string }[];
  rows: H2H[];
  /** The page's language. */
  lang: Lingua;
}) {
  const w = paroleIn(lang).faceOff;
  const [q, setQ] = useState("");
  const [pick, setPick] = useState<{ id: number; name: string } | null>(null);

  const query = q.trim();
  const matches = query ? others.filter((o) => norm(o.name).includes(norm(query))).slice(0, 6) : [];
  const usual = rows.slice(0, 4);
  const result = pick ? rows.find((r) => r.id === pick.id) : undefined;

  function choose(o: { id: number; name: string }) {
    setPick(o);
    setQ("");
  }

  return (
    <div>
      <label htmlFor="rg-opp" className="rg-eyebrow block">
        {w.who}
      </label>
      <input
        id="rg-opp"
        type="search"
        autoComplete="off"
        placeholder={w.search}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="rg-input mt-2"
        aria-controls="rg-opp-list"
      />

      {query && (
        <ul id="rg-opp-list" className="mt-2">
          {matches.length === 0 && <li className="rg-muted py-3 text-[15px]">{w.nobody}</li>}
          {matches.map((o) => (
            <li key={o.id} className="rg-hr">
              <button
                type="button"
                onClick={() => choose(o)}
                className="rg-row rg-display flex min-h-12 w-full items-center px-2 text-left text-[20px]"
              >
                {o.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!query && !pick && usual.length > 0 && (
        <div className="mt-6">
          <p className="rg-muted text-[14px] font-semibold">{w.usual}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {usual.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => choose(r)}
                className="rg-chip"
              >
                {r.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {pick && !query && (
        <div className="rg-pop mt-10" aria-live="polite">
          <p className="rg-display text-[26px] leading-tight lg:text-[32px]">
            {me} <span className="rg-muted font-[family-name:var(--font-rg-text)] text-[16px] font-semibold">{w.versus}</span>{" "}
            <Link href={`/giocatori/${pick.id}`} className="rg-ul">
              {pick.name}
            </Link>
          </p>
          {result ? (
            <>
              <div className="rg-hr mt-6 grid max-w-[420px] grid-cols-3 gap-4 pt-5">
                {[
                  { n: result.won, l: w.won },
                  { n: result.lost, l: w.lost },
                  { n: result.drawn, l: w.drawn },
                ].map((x) => (
                  <div key={x.l}>
                    <div className="rg-muted text-[14px] font-semibold">{x.l}</div>
                    <div className="rg-display rg-tight tnum mt-1 text-[64px] leading-[0.9] lg:text-[88px]">{x.n}</div>
                  </div>
                ))}
              </div>
              <p className="rg-muted mt-6 text-[15px]">
                {result.won > result.lost
                  ? w.ahead(me)
                  : result.lost > result.won
                    ? w.behind(pick.name)
                    : w.even}{" "}
                {w.matches(result.matches)}
              </p>
            </>
          ) : (
            <p className="rg-display mt-6 text-[24px] leading-tight">
              {w.never}
            </p>
          )}
          <button type="button" onClick={() => setPick(null)} className="rg-textlink mt-6 inline-flex min-h-11 items-center text-[15px]">
            {w.again}
          </button>
        </div>
      )}
    </div>
  );
}
