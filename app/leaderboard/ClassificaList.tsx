"use client";

import { useEffect, useState } from "react";
import type { LeaderboardEntry } from "../lib/api";
import { EmptyRow, RankRow } from "../components/ui";

function SearchIcon() {
  return (
    <svg
      aria-hidden
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-ink/45"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export default function ClassificaList({
  entries,
  meta,
}: {
  entries: LeaderboardEntry[];
  meta: string;
}) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  const q = debounced.trim().toLowerCase();
  const rows = entries
    .map((entry, i) => ({ entry, rank: i + 1 }))
    .filter(({ entry }) => !q || entry.display_name.toLowerCase().includes(q));

  return (
    <>
      <div className="lg:mb-6 lg:flex lg:items-end lg:justify-between">
        <div>
          <h1 className="mt-[26px] mb-2 text-[40px] font-extrabold leading-[0.95] tracking-[-0.04em] lg:mt-0 lg:mb-2.5 lg:text-[64px] lg:leading-[0.92] lg:tracking-[-0.045em]">
            Classifica
            <br />
            <span className="text-accent">completa</span>
          </h1>
          <div className="mb-4 text-[13px] text-ink/60 lg:mb-0 lg:text-[14px]">
            {meta}
          </div>
        </div>
        <label className="mb-3 flex h-11 items-center gap-2.5 rounded-[14px] border border-ink/10 bg-white px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent lg:mb-0 lg:w-[320px]">
          <SearchIcon />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca giocatore"
            aria-label="Cerca giocatore"
            autoComplete="off"
            className="w-full min-w-0 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink/45"
          />
        </label>
      </div>

      <div className="lbl grid grid-cols-[40px_1fr_auto] gap-2 px-4 pb-2 lg:grid-cols-[48px_1fr_auto] lg:gap-3 lg:px-5">
        <span>#</span>
        <span>Giocatore</span>
        <span>Punti</span>
      </div>

      <div className="card">
        {rows.length === 0 ? (
          <EmptyRow>Nessun giocatore trovato.</EmptyRow>
        ) : (
          <ul>
            {rows.map(({ entry, rank }) => (
              <RankRow
                key={entry.player_id}
                href={`/players/${entry.player_id}`}
                rank={rank}
                name={entry.display_name}
                sub={`${entry.events_played} ${entry.events_played === 1 ? "tappa" : "tappe"}`}
                points={entry.total_points}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
