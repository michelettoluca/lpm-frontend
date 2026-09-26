"use client";

import Link from "next/link";
import { useId, useMemo, useRef, useState } from "react";
import type { H2HMatch, H2HOpponent } from "../../lib/api";
import { tappaTitle } from "../../lib/format";

type Candidate = {
  id: number;
  name: string;
  matches: H2HMatch[];
  won: number;
  lost: number;
  drawn: number;
};

/** Lowercase without accents, so "nicolo" finds "Nicoló". */
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

function outcome(m: H2HMatch): "V" | "S" | "P" {
  return m.wins > m.losses ? "V" : m.losses > m.wins ? "S" : "P";
}

/**
 * Pick any player of the season and see this player's record against them.
 * Everything comes from data the page already has, so it filters locally.
 */
export default function HeadToHeadSearch({
  players,
  opponents,
  playedAt,
}: {
  /** Every player of the season except the one whose page this is. */
  players: { id: number; name: string }[];
  opponents: H2HOpponent[];
  /** Event id → ISO date, to list matches in play order. */
  playedAt: Record<number, string>;
}) {
  const candidates = useMemo<Candidate[]>(() => {
    const byId = new Map(opponents.map((o) => [o.opponent_id, o.matches]));
    return players
      .map((p) => {
        const matches = [...(byId.get(p.id) ?? [])].sort(
          (a, b) => (playedAt[a.event_id] ?? "").localeCompare(playedAt[b.event_id] ?? "") || a.round_no - b.round_no,
        );
        const count = (o: string) => matches.filter((m) => outcome(m) === o).length;
        return { ...p, matches, won: count("V"), lost: count("S"), drawn: count("P") };
      })
      // Opponents already faced first, most matches first, then by name.
      .sort((a, b) => b.matches.length - a.matches.length || a.name.localeCompare(b.name));
  }, [players, opponents, playedAt]);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const results = useMemo(() => {
    const q = fold(query.trim());
    return q ? candidates.filter((c) => fold(c.name).includes(q)) : candidates;
  }, [candidates, query]);

  function choose(c: Candidate) {
    setSelected(c);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open && results[active]) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const games = selected?.matches.reduce(
    (g, m) => ({ w: g.w + m.wins, l: g.l + m.losses, d: g.d + m.draws }),
    { w: 0, l: 0, d: 0 },
  );

  return (
    <div>
      <div className="relative">
        <label className="surface flex h-11 items-center gap-2.5 rounded-[14px] px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
          <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-ink/40">
            <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="m13.5 13.5 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && results[active] ? `${listId}-${results[active].id}` : undefined}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={onKeyDown}
            placeholder="Cerca un giocatore"
            className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink/40"
          />
        </label>

        {open && (
          <ul
            id={listId}
            role="listbox"
            className="surface absolute inset-x-0 top-full z-20 mt-1.5 max-h-72 overflow-y-auto rounded-[14px] py-1"
          >
            {results.length === 0 ? (
              <li className="px-4 py-3 text-[13px] text-ink/50">Nessun giocatore trovato.</li>
            ) : (
              results.map((c, i) => (
                <li
                  key={c.id}
                  id={`${listId}-${c.id}`}
                  role="option"
                  aria-selected={i === active}
                  // Keep focus in the input so blur doesn't close the list first.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(c);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-2 text-[14px] ${
                    i === active ? "bg-ink/[0.045]" : ""
                  }`}
                >
                  <span className="truncate font-bold capitalize">{c.name}</span>
                  {c.matches.length > 0 ? (
                    <span className="tn shrink-0 text-[13px] font-extrabold">
                      {c.won}-{c.lost}-{c.drawn}
                    </span>
                  ) : (
                    <span className="shrink-0 text-[12px] text-ink/40">mai affrontato</span>
                  )}
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {selected && games && (
        <div className="card panel-in mt-2.5">
          <div className="flex items-center justify-between gap-3 border-b border-ink/8 px-4 py-3 lg:px-5">
            <div className="min-w-0">
              <div className="lbl">Contro</div>
              <Link
                href={`/players/${selected.id}`}
                className="block truncate text-[16px] font-extrabold capitalize hover:text-ink/70 lg:text-[17px]"
              >
                {selected.name}
              </Link>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              {selected.matches.length > 0 && (
                <>
                  <div className="text-right">
                    <div className="lbl">Partite</div>
                    <div className="tn text-accent-grad text-[20px] font-extrabold leading-tight tracking-[-0.03em]">
                      {selected.won}-{selected.lost}-{selected.drawn}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="lbl">Game</div>
                    <div className="tn text-[20px] font-extrabold leading-tight tracking-[-0.03em]">
                      {games.w}-{games.l}
                      {games.d > 0 && `-${games.d}`}
                    </div>
                  </div>
                </>
              )}
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Chiudi confronto"
                className="grid h-8 w-8 place-items-center rounded-full text-ink/45 transition-colors hover:bg-ink/5 hover:text-ink"
              >
                ✕
              </button>
            </div>
          </div>
          {selected.matches.length === 0 ? (
            <p className="px-4 py-5 text-center text-[13px] text-ink/50 lg:px-5">
              Non vi siete ancora affrontati in questa stagione.
            </p>
          ) : (
            <ul>
              {selected.matches.map((m) => {
                const o = outcome(m);
                return (
                  <li
                    key={`${m.event_id}-${m.round_no}`}
                    className="grid grid-cols-[28px_1fr_auto] items-center gap-3 border-b border-ink/8 px-4 py-2.5 last:border-b-0 lg:px-5"
                  >
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-lg text-[12px] font-extrabold ${
                        o === "V" ? "bg-accent-grad text-white" : o === "S" ? "bg-ink text-white" : "bg-draw text-ink"
                      }`}
                    >
                      {o}
                    </span>
                    <Link href={`/events/${m.event_id}`} className="min-w-0 truncate text-[14px] font-bold hover:text-ink/70">
                      {tappaTitle(m.event_name)}
                      <span className="ml-1.5 font-normal text-ink/50">· turno {m.round_no}</span>
                    </Link>
                    <span className="tn text-[15px] font-extrabold tracking-[-0.02em]">
                      {m.wins}-{m.losses}
                      {m.draws > 0 && `-${m.draws}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
