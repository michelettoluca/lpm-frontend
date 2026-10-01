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
  searchNames,
  UNAVAILABLE,
  type Archetype,
  type ManaColor,
} from "../lib/decks";

/** The mana symbol as printed on cards, from Scryfall, served from /public/mana. */
export function ManaPip({ color, size = 17 }: { color: ManaColor; size?: number }) {
  return (
    <Image
      src={`/mana/${color}.svg`}
      alt=""
      width={size}
      height={size}
      unoptimized
      aria-hidden
      className="shrink-0 rounded-full shadow-[-1px_1px_0_rgba(0,0,0,0.85)]"
    />
  );
}

/** The archetype's colors as mana symbols; `small` matches 13px text, for the admin. */
export function ManaCost({ archetype, small = false }: { archetype: Archetype; small?: boolean }) {
  const colors = colorsOf(archetype);
  if (colors.length === 0) return null;
  return (
    <span
      className={`flex ${small ? "gap-0.5" : "gap-[3px]"}`}
      aria-label={colors.map((c) => COLOR_NAMES[c]).join(", ")}
    >
      {colors.map((c) => (
        <ManaPip key={c} color={c} size={small ? 12 : 17} />
      ))}
    </span>
  );
}

/** Pause in typing before Jev is asked. */
const SUGGEST_DELAY_MS = 350;
/** Rows shown for a typed search: Jev's picks first, then name matches. */
const MAX_ROWS = 8;
/**
 * Jev always names some archetypes, even for gibberish ("asdfgh" gets five,
 * the likeliest at 0.14), while a real name scores far higher ("elfi" 0.94,
 * "affinity" 0.62). Below MIN_TOP Jev is guessing and none of its picks is
 * shown; otherwise picks under MIN_PICK are dropped as noise.
 */
const MIN_TOP = 0.2;
const MIN_PICK = 0.1;

type Suggested = { query: string; ids: number[] };

/** Jev's picks worth showing, likeliest first. */
function confident(list: { id: number; probability?: number }[]): number[] {
  // Older API responses carry no probability: keep them all, as before.
  if (list.some((a) => a.probability === undefined)) return list.map((a) => a.id);
  const top = Math.max(0, ...list.map((a) => a.probability ?? 0));
  if (top < MIN_TOP) return [];
  return list.filter((a) => (a.probability ?? 0) >= MIN_PICK).map((a) => a.id);
}

/**
 * The deck search shared by the player flow and the admin pages: name matches
 * at once, then Jev's picks (up to five, likeliest first) as soon as the
 * typing pauses. Jev reads colors as WUBRG letters or guild names, nicknames,
 * typos and card names; without it, or while it answers, the name search
 * works on its own. An empty query finds nothing.
 */
export function useArchetypeSearch<T extends Archetype>(archetypes: T[], query: string, maxRows = MAX_ROWS) {
  const [suggested, setSuggested] = useState<Suggested | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [jevOff, setJevOff] = useState(false);
  const index = useMemo(() => indexArchetypes(archetypes), [archetypes]);
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
        const list = (await res.json()) as { id: number; probability?: number }[];
        setSuggested({ query: trimmed, ids: confident(list) });
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

  const rows = useMemo((): T[] => {
    if (!trimmed) return [];
    const byId = new Map(archetypes.map((a) => [a.id, a]));
    const local = searchArchetypes(index, trimmed).map((a) => byId.get(a.id)!);
    // Until Jev answers, the name search fills the list on its own.
    if (suggested?.query !== trimmed || suggested.ids.length === 0) return local.slice(0, maxRows);
    const picks = suggested.ids.map((id) => byId.get(id)).filter((a): a is T => a !== undefined);
    // After that, only decks whose name, alias or key card contains what was
    // typed join Jev's picks: looser matches such as "every blue-black deck"
    // for "UB" are noise.
    const typed = normalize(trimmed);
    const named = local.filter((a) => !picks.includes(a) && searchNames(a).some((n) => normalize(n).includes(typed)));
    return [...picks, ...named].slice(0, maxRows);
  }, [index, trimmed, archetypes, suggested, maxRows]);

  const searching = trimmed.length >= 2 && asking === trimmed && rows.length === 0;
  return { rows, searching };
}

/**
 * Deck picker. The list starts hidden, since most of the archetypes are
 * irrelevant to any one player; typing runs useArchetypeSearch.
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
  const visible = useMemo(
    () => archetypes.filter((a) => admin || (a.name !== UNAVAILABLE && a.name !== ROGUE)),
    [archetypes, admin],
  );
  const trimmed = query.trim();
  const { rows, searching } = useArchetypeSearch(visible, query);
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
          className={
            admin
              ? // 16px on phones keeps iOS from zooming into the field.
                "h-9 w-full rounded-md border border-ink/15 bg-surface px-2.5 text-[16px] outline-none transition-colors placeholder:text-[13px] focus:border-accent focus:ring-2 focus:ring-accent/15 sm:text-[13px]"
              : "w-full rounded-lg border border-ink/15 bg-surface px-4 py-3 text-[16px] outline-none transition-colors placeholder:text-[13px] focus:border-accent"
          }
        />
      </div>

      {!trimmed ? (
        <p className={`mt-3 px-1 leading-relaxed text-ink/55 ${admin ? "text-[12px]" : "text-[14px]"}`}>
          Scrivi il nome del mazzo, i suoi colori (es. <strong className="text-ink/75">UB</strong>,{" "}
          <strong className="text-ink/75">mono rosso</strong>) o una carta che giochi.
        </p>
      ) : (
        <ul
          className={`min-h-0 flex-1 divide-y divide-ink/8 overflow-y-auto border border-ink/8 bg-surface ${
            admin ? "mt-2 rounded-md" : "mt-3 rounded-lg"
          }`}
          aria-busy={searching}
        >
          {rows.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onPick(a)}
                className={`flex w-full items-center justify-between gap-3 text-left transition-colors hover:bg-ink/[0.03] ${
                  admin ? "px-3 py-2 text-[13px] font-medium" : "px-4 py-3.5 text-[15px] font-semibold"
                } ${
                  a.id === selectedId ? "bg-tint text-accent" : ""
                }`}
              >
                <span className="min-w-0 truncate">{a.name}</span>
                <ManaCost archetype={a} small={admin} />
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
                  className="inline-flex h-9 items-center rounded-lg border border-ink/12 bg-surface px-3.5 text-[13px] font-bold hover:bg-ink/[0.03]"
                >
                  {a.name}
                </button>
              ),
          )}
        </div>
      )}

      {rogue && !admin && trimmed && (
        <div
          className={`mt-3 rounded-lg border border-dashed px-4 py-3.5 ${
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
            className="mt-2.5 inline-flex h-10 items-center rounded-lg border border-ink/12 bg-surface px-4 text-[14px] font-bold shadow-[0_1px_2px_rgba(28,27,26,0.06)] hover:bg-ink/[0.03]"
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
