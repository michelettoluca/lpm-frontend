"use client";

import { useState } from "react";

export type H2HMatch = {
  event_id: number;
  event_name: string;
  round_no: number;
  wins: number;
  losses: number;
  draws: number;
};

export type H2HOpponent = {
  opponent_id: number;
  opponent_name: string;
  matches: H2HMatch[];
};

function shortEventName(name: string): string {
  const match = name.match(/Tappa\s+\d+/i);
  return match ? match[0] : name;
}

function aggregate(matches: H2HMatch[]) {
  const games = matches.reduce(
    (acc, m) => ({
      wins: acc.wins + m.wins,
      losses: acc.losses + m.losses,
      draws: acc.draws + m.draws,
    }),
    { wins: 0, losses: 0, draws: 0 },
  );
  const matchRecord = matches.reduce(
    (acc, m) => {
      if (m.wins > m.losses) acc.won += 1;
      else if (m.losses > m.wins) acc.lost += 1;
      else acc.drawn += 1;
      return acc;
    },
    { won: 0, lost: 0, drawn: 0 },
  );
  const matchesPlayed = matches.length;
  const gamesPlayed = games.wins + games.losses + games.draws;
  const matchWinrate =
    matchesPlayed > 0
      ? ((matchRecord.won + matchRecord.drawn * 0.5) / matchesPlayed) * 100
      : 0;
  const gameWinrate =
    gamesPlayed > 0
      ? ((games.wins + games.draws * 0.5) / gamesPlayed) * 100
      : 0;
  return {
    games,
    matchRecord,
    matchesPlayed,
    gamesPlayed,
    matchWinrate,
    gameWinrate,
  };
}

function fmtPct(n: number) {
  return `${n.toFixed(1).replace(/\.0$/, "")}%`;
}

export default function HeadToHead({ opponents }: { opponents: H2HOpponent[] }) {
  const sorted = [...opponents].sort(
    (a, b) =>
      b.matches.length - a.matches.length ||
      a.opponent_name.localeCompare(b.opponent_name),
  );
  const [selectedId, setSelectedId] = useState<number | null>(
    sorted[0]?.opponent_id ?? null,
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-black/[0.08] px-5 py-8 text-center text-[0.85rem] text-ink-light">
        Nessun match registrato.
      </div>
    );
  }

  const selected = sorted.find((o) => o.opponent_id === selectedId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <label className="block">
        <span className="mb-1.5 block px-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-ink-light">
          Avversario
        </span>
        <select
          value={selectedId ?? ""}
          onChange={(e) =>
            setSelectedId(e.target.value ? Number(e.target.value) : null)
          }
          className="w-full appearance-none rounded-2xl border-2 border-black/[0.06] bg-card px-4 py-3 text-[0.95rem] font-semibold text-ink shadow-none outline-none transition-colors hover:border-black/[0.12] focus:border-red-accent"
        >
          {sorted.map((o) => {
            const agg = aggregate(o.matches);
            return (
              <option key={o.opponent_id} value={o.opponent_id}>
                {o.opponent_name} — {agg.matchesPlayed} match (
                {agg.matchRecord.won}-{agg.matchRecord.lost}
                {agg.matchRecord.drawn > 0 ? `-${agg.matchRecord.drawn}` : ""}{" "}
                · {fmtPct(agg.matchWinrate)})
              </option>
            );
          })}
        </select>
      </label>

      {selected && (
        <div className="flex flex-col gap-3">
          {(() => {
            const agg = aggregate(selected.matches);
            return (
              <div className="flex flex-col gap-2">
                <div className="rounded-2xl bg-red-accent px-4 py-3 text-white shadow-[0_8px_30px_rgba(239,68,68,0.2)]">
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <div className="text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-white/60">
                        Match winrate
                      </div>
                      <div className="mt-0.5 font-display text-[1.7rem] font-bold leading-none tracking-[-0.02em]">
                        {fmtPct(agg.matchWinrate)}
                      </div>
                    </div>
                    <div className="text-right text-[0.72rem] font-medium text-white/80">
                      <div>
                        <strong className="font-bold text-white">
                          {agg.matchRecord.won}
                        </strong>
                        V ·{" "}
                        <strong className="font-bold text-white">
                          {agg.matchRecord.lost}
                        </strong>
                        S
                        {agg.matchRecord.drawn > 0 && (
                          <>
                            {" "}·{" "}
                            <strong className="font-bold text-white">
                              {agg.matchRecord.drawn}
                            </strong>
                            P
                          </>
                        )}
                      </div>
                      <div className="text-white/60">
                        {agg.matchesPlayed} match
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-card border-2 border-black/[0.06] px-3 py-2.5">
                    <div className="text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-ink-light">
                      Game winrate
                    </div>
                    <div className="mt-0.5 font-display text-[1.25rem] font-bold leading-none tracking-[-0.02em] text-ink">
                      {fmtPct(agg.gameWinrate)}
                    </div>
                    <div className="mt-1 text-[0.66rem] text-ink-light">
                      {agg.games.wins}V · {agg.games.losses}S · {agg.games.draws}P
                    </div>
                  </div>
                  <div className="rounded-2xl bg-card border-2 border-black/[0.06] px-3 py-2.5">
                    <div className="text-[0.55rem] font-semibold uppercase tracking-[0.12em] text-ink-light">
                      Games per match
                    </div>
                    <div className="mt-0.5 font-display text-[1.25rem] font-bold leading-none tracking-[-0.02em] text-ink">
                      {agg.matchesPlayed > 0
                        ? (agg.gamesPlayed / agg.matchesPlayed).toFixed(2)
                        : "–"}
                    </div>
                    <div className="mt-1 text-[0.66rem] text-ink-light">
                      {agg.gamesPlayed} games totali
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <ul className="flex flex-col gap-2">
            {selected.matches.map((m) => (
              <li
                key={`${m.event_id}-${m.round_no}`}
                className="flex items-center gap-3 rounded-2xl bg-card border-2 border-black/[0.06] px-4 py-3"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-black/[0.04] text-[0.72rem] font-bold text-ink-mid">
                  R{m.round_no}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.9rem] font-semibold text-ink">
                    {shortEventName(m.event_name)}
                  </div>
                  <div className="text-[0.66rem] text-ink-light">
                    {m.wins}V · {m.losses}S · {m.draws}P
                  </div>
                </div>
                <div className="flex-shrink-0 font-display text-[1.1rem] font-bold tabular-nums text-ink">
                  {m.wins}-{m.losses}
                  {m.draws > 0 ? `-${m.draws}` : ""}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
