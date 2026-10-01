"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  COLOR_NAMES,
  colorsOf,
  indexArchetypes,
  normalize,
  ROGUE,
  searchArchetypes,
  UNAVAILABLE,
  type Archetype,
  type ManaColor,
} from "../lib/decks";

/** The mana symbol as printed on cards, from Scryfall, served from /public/mana. */
export function ManaPip({ color }: { color: ManaColor }) {
  return (
    <Image
      src={`/mana/${color}.svg`}
      alt=""
      width={17}
      height={17}
      unoptimized
      aria-hidden
      className="shrink-0 rounded-full shadow-[-1px_1px_0_rgba(0,0,0,0.85)]"
    />
  );
}

export function ManaCost({ archetype }: { archetype: Archetype }) {
  const colors = colorsOf(archetype);
  if (colors.length === 0) return null;
  return (
    <span className="flex gap-[3px]" aria-label={colors.map((c) => COLOR_NAMES[c]).join(", ")}>
      {colors.map((c) => (
        <ManaPip key={c} color={c} />
      ))}
    </span>
  );
}

/** Pause in typing before Jev is asked. */
const SUGGEST_DELAY_MS = 350;
/** Rows shown for a typed search: Jev's picks first, then name matches. */
const MAX_ROWS = 8;

type Suggested = { query: string; ids: number[] };

/**
 * Deck search. The list starts hidden, since most of the archetypes are
 * irrelevant to any one player: typing shows the name matches at once, then
 * Jev's picks (up to five, likeliest first) as soon as the player pauses.
 * Jev reads colors as WUBRG letters or guild names, nicknames, typos and card
 * names; without it the name search still works on its own.
 *
 * Players never see "Non Disponibile"; admins get it, and Rogue, as quick
 * picks. Once a player is searching, the way out is "my deck isn't on the
 * list", which records Rogue without making anyone guess what Rogue means.
 */
export function ArchetypePicker({
  archetypes,
  onPick,
  selectedId,
  admin = false,
  autoFocus = false,
}: {
  archetypes: Archetype[];
  onPick: (archetype: Archetype) => void;
  selectedId?: number;
  admin?: boolean;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [suggested, setSuggested] = useState<Suggested | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [jevOff, setJevOff] = useState(false);

  const visible = useMemo(
    () => archetypes.filter((a) => admin || (a.name !== UNAVAILABLE && a.name !== ROGUE)),
    [archetypes, admin],
  );
  const index = useMemo(() => indexArchetypes(visible), [visible]);
  const trimmed = query.trim();

  useEffect(() => {
    if (jevOff || trimmed.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setAsking(trimmed);
      try {
        const res = await fetch("/api/dichiara/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed }),
          signal: controller.signal,
        });
        // Not configured on this server: stop asking, the name search remains.
        if (res.status === 503) setJevOff(true);
        if (!res.ok) return;
        const list = (await res.json()) as { id: number }[];
        setSuggested({ query: trimmed, ids: list.map((a) => a.id) });
      } catch {
        // Aborted by the next keystroke, or offline: the name search remains.
      } finally {
        setAsking((current) => (current === trimmed ? null : current));
      }
    }, SUGGEST_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, jevOff]);

  const rows = useMemo(() => {
    if (!trimmed) return [];
    const local = searchArchetypes(index, query);
    // Until Jev answers, the name search fills the list on its own.
    if (suggested?.query !== trimmed || suggested.ids.length === 0) return local.slice(0, MAX_ROWS);
    const byId = new Map(visible.map((a) => [a.id, a]));
    const picks = suggested.ids
      .map((id) => byId.get(id))
      .filter((a): a is Archetype => a !== undefined);
    // After that, only names that contain what was typed join Jev's picks:
    // looser matches such as "every blue-black deck" for "UB" are noise.
    const typed = normalize(trimmed);
    const named = local.filter((a) => !picks.includes(a) && normalize(a.name).includes(typed));
    return [...picks, ...named].slice(0, MAX_ROWS);
  }, [index, query, trimmed, visible, suggested]);

  const searching = trimmed.length >= 2 && asking === trimmed && rows.length === 0;
  const rogue = archetypes.find((a) => a.name === ROGUE);
  const unavailable = archetypes.find((a) => a.name === UNAVAILABLE);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nome, colori (es. UB) o una carta…"
          aria-label="Cerca il mazzo"
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={200}
          className="w-full rounded-2xl border-[1.5px] border-ink/15 bg-white px-4 py-3 text-[16px] outline-none transition-colors focus:border-accent"
        />
      </div>

      {!trimmed ? (
        <p className="mt-4 px-1 text-[14px] leading-relaxed text-ink/55">
          Scrivi il nome del mazzo, i suoi colori (es. <strong className="text-ink/75">UB</strong>,{" "}
          <strong className="text-ink/75">mono rosso</strong>) o una carta che giochi.
        </p>
      ) : (
        <ul
          className="mt-3 min-h-0 flex-1 divide-y divide-ink/8 overflow-y-auto rounded-2xl border border-ink/8 bg-white"
          aria-busy={searching}
        >
          {rows.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onPick(a)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-[15px] font-semibold transition-colors hover:bg-ink/[0.03] ${
                  a.id === selectedId ? "bg-tint text-accent" : ""
                }`}
              >
                <span className="min-w-0 truncate">{a.name}</span>
                <ManaCost archetype={a} />
              </button>
            </li>
          ))}
          {searching && <li className="px-5 py-6 text-center text-[14px] text-ink/50">Cerco…</li>}
          {rows.length === 0 && !searching && (
            <li className="px-5 py-8 text-center">
              <p className="text-[15px] font-bold">Nessun mazzo trovato</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink/55">
                Prova con un&apos;altra parola o una carta del mazzo.
              </p>
            </li>
          )}
        </ul>
      )}

      {admin && (rogue || unavailable) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {[rogue, unavailable].map(
            (a) =>
              a && (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onPick(a)}
                  className="inline-flex h-9 items-center rounded-xl border border-ink/12 bg-white px-3.5 text-[13px] font-bold hover:bg-ink/[0.03]"
                >
                  {a.name}
                </button>
              ),
          )}
        </div>
      )}

      {rogue && !admin && trimmed && (
        <div
          className={`mt-3 rounded-2xl border border-dashed px-4 py-3.5 ${
            rows.length === 0 && !searching ? "border-accent bg-tint" : "border-ink/20"
          }`}
        >
          <p className="text-[14px] font-bold">Il tuo mazzo non è in questa lista?</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink/60">
            Nessun problema: lo segniamo come mazzo fuori lista.
          </p>
          <button
            type="button"
            onClick={() => onPick(rogue)}
            className="mt-2.5 inline-flex h-10 items-center rounded-xl border border-ink/12 bg-white px-4 text-[14px] font-bold shadow-[0_1px_2px_rgba(28,27,26,0.06)] hover:bg-ink/[0.03]"
          >
            Il mio mazzo non è nella lista
          </button>
        </div>
      )}
    </div>
  );
}

/** How a declared archetype reads to a player: Rogue says what it means. */
export function deckLabel(name: string): string {
  return name === ROGUE ? "Mazzo fuori lista (Rogue)" : name;
}
