"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AdminError } from "@/app/lib/adminTypes";
import { ArchetypePicker, ManaCost } from "@/app/components/ArchetypePicker";
import { archetypeLabel, normalize, UNAVAILABLE, type Archetype } from "@/app/lib/decks";
import { useAdmin } from "../AdminShell";
import {
  Badge,
  BUTTON,
  BUTTON_DANGER,
  BUTTON_PRIMARY,
  Dialog,
  DIALOG_FORM,
  DialogFooter,
  displayDate,
  EmptyState,
  notify,
  Pagination,
  usePage,
} from "../dashboardUi";
import { CONTROL } from "../fields";
import { tappaTitle } from "@/app/lib/format";
import { meleeTournamentUrl } from "@/app/lib/melee";

// What the Archetipi pages share: the tournament's data and the actions on
// it, and the pieces both the dashboard and the table walk show.

export type Declaration = {
  team_id: number;
  registration_id: number;
  username: string;
  player_name: string;
  archetype_id: number;
  archetype_name: string;
  source: "player" | "admin";
};

export type Seat = {
  team_id: number;
  registration_id: number;
  username: string;
  name: string;
  declaration: Declaration | null;
};

export type Player = Seat & { dropped: boolean };

export type Table = { number: number; seats: Seat[] };

/** How players find themselves on /mazzo: by their table's number, or by name. */
export type FindBy = "table" | "name";

export type View = {
  /** Missing from an API that predates the choice, which went by table. */
  find_by?: FindBy;
  tournament: {
    id: number;
    name: string;
    opened_at: string;
    closed_at: string | null;
    open: boolean;
    /** The tappa played as this tournament. */
    event_id: number | null;
  } | null;
  round: { number: number; published: boolean; tables: Table[]; byes: Seat[] } | null;
  players: Player[];
};

/** How far a table is: every seat declared, some, or none. */
export type Fill = "full" | "partial" | "empty";

export function fillOf(table: Table): Fill {
  const declared = table.seats.filter((s) => s.declaration).length;
  return declared === table.seats.length ? "full" : declared > 0 ? "partial" : "empty";
}

export const FILL_SKIN: Record<Fill, string> = {
  full: "border-[#22c55e]/35 bg-[#22c55e]/15 text-[#4ade80]",
  partial: "border-[#f59e0b]/40 bg-[#f59e0b]/15 text-[#fbbf24]",
  empty: "border-ink/12 bg-surface text-ink/55",
};

export const FILL_LABEL: Record<Fill, string> = {
  full: "completo",
  partial: "manca un mazzo",
  empty: "nessun mazzo",
};

/** Byes ride along as a last pseudo-table numbered 0. */
export const BYE = 0;

export function tableTitle(n: number) {
  return n === BYE ? "Bye" : `Tavolo ${n}`;
}

const REFRESH_MS = 20_000;

/**
 * The open tournament's pairings, roster and decks, refreshed every 20
 * seconds while the page is visible, with the actions both pages need.
 */
export function useDeclarations() {
  const { call, setLive } = useAdmin();
  const [view, setView] = useState<View | null>(null);
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [error, setError] = useState<AdminError | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await call<View>("/api/admin/declarations");
    if (!res.ok) {
      setError(res.error);
      return null;
    }
    setError(null);
    setView(res.data);
    // Keep the sidebar's live mark in step with what this page shows.
    setLive(res.data.tournament);
    return res.data;
  }, [call, setLive]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
    void load();
    // The admin list includes blacklisted archetypes: admins can still set one.
    void call<Archetype[]>("/api/admin/archetypes").then((res) => setArchetypes(res.ok ? res.data : []));
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load, call]);

  const walk = useMemo<Table[]>(() => {
    if (!view?.round?.published) return [];
    const tables = [...view.round.tables];
    if (view.round.byes.length > 0) tables.push({ number: BYE, seats: view.round.byes });
    return tables;
  }, [view]);

  /** Set or clear a player's deck. Resolves true once saved. */
  async function setDeck(seat: Seat, archetype: Archetype | null) {
    setBusy(true);
    const res = archetype
      ? await call<Declaration>(`/api/admin/declarations/teams/${seat.team_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archetype_id: archetype.id }),
        })
      : await call<{ ok: boolean }>(`/api/admin/declarations/teams/${seat.team_id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    // Show it at once; the reload that follows brings the rest up to date.
    const declaration = archetype ? (res.data as Declaration) : null;
    setView((v) => (v ? withDeclaration(v, seat.team_id, declaration) : v));
    void load();
    return true;
  }

  /** Make tappa eventId the tournament in progress, or reopen it to players. */
  async function openTappa(eventId: number, reopening = false) {
    setBusy(true);
    const ok = await startTappa(call, eventId);
    setBusy(false);
    if (!ok.ok) {
      setError(ok.error);
      return false;
    }
    notify(
      reopening
        ? "Raccolta attiva: sul sito è tornato il pulsante «il mio mazzo»."
        : "Tappa in corso, raccolta attiva: sul sito c'è il pulsante «il mio mazzo».",
    );
    await load();
    return true;
  }

  async function closeDeclarations() {
    setBusy(true);
    const res = await call("/api/admin/declarations/close", { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    notify("Raccolta disattivata: il pulsante «il mio mazzo» non è più sul sito. Tu puoi ancora modificare i mazzi.");
    await load();
    return true;
  }

  async function setFindBy(by: FindBy) {
    setBusy(true);
    const res = await call<{ find_by: FindBy }>("/api/admin/declarations/find-by", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ find_by: by }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    setView((v) => (v ? { ...v, find_by: res.data.find_by } : v));
    notify(
      by === "name"
        ? "Su /mazzo i giocatori ora cercano il proprio nome."
        : "Su /mazzo i giocatori ora inseriscono il numero del tavolo.",
    );
    return true;
  }

  return { call, view, archetypes, error, busy, walk, setDeck, openTappa, closeDeclarations, setFindBy };
}

/**
 * Where the table walk stands: the current table, and moving to the next one
 * that still misses a deck. It starts at the first incomplete table, and again
 * whenever a new round is paired, since the old table numbers mean nothing
 * any more.
 */
export function useWalk(walk: Table[], round: number | null) {
  const [at, setAt] = useState<number | "end" | null>(null);
  const roundRef = useRef<number | null>(null);

  useEffect(() => {
    if (walk.length === 0) return;
    if (roundRef.current === round && at !== null) return;
    if (roundRef.current !== null && roundRef.current !== round) {
      notify(`Turno ${round} abbinato: riparti dal primo tavolo incompleto.`);
    }
    roundRef.current = round;
    const first = walk.find((t) => fillOf(t) !== "full") ?? walk[0];
    setAt(first.number);
  }, [walk, round, at]);

  const index = at === "end" ? walk.length : walk.findIndex((t) => t.number === at);
  const table = index >= 0 && index < walk.length ? walk[index] : null;

  function next() {
    const after = walk.slice(index + 1).find((t) => fillOf(t) !== "full");
    setAt(after ? after.number : "end");
  }

  function previous() {
    const i = index <= 0 ? 0 : index - 1;
    if (walk[i]) setAt(walk[i].number);
  }

  return { at, setAt, index, table, next, previous };
}

export function withDeclaration(view: View, teamId: number, declaration: Declaration | null): View {
  const patch = <S extends Seat>(s: S): S => (s.team_id === teamId ? { ...s, declaration } : s);
  return {
    ...view,
    players: view.players.map(patch),
    round: view.round && {
      ...view.round,
      tables: view.round.tables.map((t) => ({ ...t, seats: t.seats.map(patch) })),
      byes: view.round.byes.map(patch),
    },
  };
}

export function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[13px] text-ink/50">{label}</p>
      <p className="mt-0.5 text-[17px] font-semibold">{children}</p>
    </div>
  );
}

/** Every table of the round, colored by how many decks are in; tap to go there. */
export function TableStrip({
  walk,
  at,
  onGo,
  legend = true,
}: {
  walk: Table[];
  at: number | "end" | null;
  onGo: (n: number) => void;
  legend?: boolean;
}) {
  const current = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    current.current?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [at]);
  return (
    <div className={legend ? "mb-4" : ""}>
      {/* One row that scrolls sideways, every cell the same width, "Bye" included. */}
      <div className="-mx-4 flex gap-1 overflow-x-auto px-4 py-1 [scrollbar-width:none]">
        {walk.map((w) => (
          <button
            key={w.number}
            ref={w.number === at ? current : undefined}
            type="button"
            onClick={() => onGo(w.number)}
            aria-label={`${tableTitle(w.number)}: ${FILL_LABEL[fillOf(w)]}`}
            aria-current={w.number === at ? "true" : undefined}
            className={`tn h-10 w-10 shrink-0 rounded-md border text-[13px] font-medium transition ${FILL_SKIN[fillOf(w)]} ${
              w.number === at ? "ring-2 ring-ink/70 ring-offset-1 ring-offset-page" : "hover:brightness-95"
            }`}
          >
            {w.number === BYE ? "Bye" : w.number}
          </button>
        ))}
      </div>
      {legend && (
        <div className="mt-2 flex flex-wrap gap-4 text-[13px] text-ink/50">
          <Legend fill="full">Completo</Legend>
          <Legend fill="partial">Manca un mazzo</Legend>
          <Legend fill="empty">Nessun mazzo</Legend>
        </div>
      )}
    </div>
  );
}

export function Legend({ fill, children }: { fill: Fill; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-sm border ${FILL_SKIN[fill]}`} />
      {children}
    </span>
  );
}

export function TableCard({
  table,
  position,
  archetypes,
  onPick,
  footer,
}: {
  table: Table;
  position: string;
  archetypes: Archetype[];
  onPick: (seat: Seat) => void;
  footer: React.ReactNode;
}) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-baseline justify-between border-b border-ink/8 px-4 py-2.5">
        <h2 className="text-[17px] font-semibold">{tableTitle(table.number)}</h2>
        <span className="tn text-[13px] text-ink/45">{position}</span>
      </div>
      {/* On a phone the two players stack, each with the full width for a long name and deck. */}
      <div
        className={`grid divide-ink/8 ${
          table.seats.length === 1 ? "grid-cols-1" : "grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0"
        }`}
      >
        {table.seats.map((seat) => {
          const d = seat.declaration;
          const archetype = d ? archetypes.find((a) => a.id === d.archetype_id) : undefined;
          return (
            <button
              key={seat.team_id}
              type="button"
              onClick={() => onPick(seat)}
              // Stacked on a phone, each player is a row: name on the left, the
              // deck or "Scegli mazzo" on the right. Side by side, a column.
              className="flex min-h-[64px] items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-ink/[0.02] sm:min-h-[120px] sm:flex-col sm:items-stretch"
            >
              <span className="min-w-0">
                <span className="block text-[16px] font-medium break-words">{seat.name}</span>
                {seat.username && <span className="block truncate text-[13px] text-ink/45">{seat.username}</span>}
              </span>
              {d ? (
                <span className="min-w-0 text-right sm:text-left">
                  <span className="flex flex-wrap items-center justify-end gap-1.5 text-[15px] font-medium sm:justify-start">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#22c55e]" aria-hidden />
                    {archetypeLabel(d.archetype_name)}
                    {archetype && <ManaCost archetype={archetype} small />}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-ink/45">
                    {d.source === "player" ? "Dal giocatore" : "Da admin"} · Cambia
                  </span>
                </span>
              ) : (
                <span className={`${BUTTON} shrink-0 sm:self-start`}>Scegli mazzo</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between gap-2 border-t border-ink/8 bg-ink/[0.015] px-4 py-2.5">{footer}</div>
    </section>
  );
}

export function EndCard({ walk, onGo }: { walk: Table[]; onGo: (n: number) => void }) {
  const missing = walk.filter((t) => fillOf(t) !== "full");
  return (
    <section className="card px-4 py-8 text-center">
      <p className="text-[17px] font-semibold">{missing.length === 0 ? "Tutti i tavoli sono completi" : "Fine dei tavoli"}</p>
      {missing.length > 0 && (
        <>
          <p className="mt-1 text-[15px] text-ink/55">
            {missing.length === 1 ? "Manca ancora un tavolo:" : `Mancano ancora ${missing.length} tavoli:`}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-1">
            {missing.map((t) => (
              <button
                key={t.number}
                type="button"
                onClick={() => onGo(t.number)}
                className={`tn h-8 min-w-8 rounded-md border px-1.5 text-[13px] font-medium ${FILL_SKIN[fillOf(t)]}`}
              >
                {t.number === BYE ? "Bye" : t.number}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

/** A seat's deck in DeckDialog, saying who set it. */
export function DeckPickerDialog({
  seat,
  archetypes,
  busy,
  onSave,
  onClose,
}: {
  seat: Seat;
  archetypes: Archetype[];
  busy: boolean;
  onSave: (archetype: Archetype | null) => void;
  onClose: () => void;
}) {
  const current = seat.declaration;
  return (
    <DeckDialog
      title={seat.name}
      description={
        current ? `Indicato ${current.source === "player" ? "dal giocatore" : "da un admin"}` : "Nessun mazzo indicato"
      }
      current={current}
      archetypes={archetypes}
      busy={busy}
      onSave={onSave}
      onClose={onClose}
    />
  );
}

/**
 * A player's deck, as a form like every side panel: the chosen deck with a
 * button to remove it, the archetype search once there is none, and Salva at
 * the bottom. Nothing is saved until Salva.
 */
export function DeckDialog({
  title,
  description,
  current,
  archetypes,
  busy,
  onSave,
  onClose,
}: {
  title: string;
  description?: React.ReactNode;
  current: { archetype_id: number; archetype_name: string } | null;
  archetypes: Archetype[];
  busy: boolean;
  onSave: (archetype: Archetype | null) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Archetype | null>(() =>
    current
      ? (archetypes.find((a) => a.id === current.archetype_id) ?? {
          id: current.archetype_id,
          name: current.archetype_name,
          colors: [],
        })
      : null,
  );
  const changed = (draft?.id ?? null) !== (current?.archetype_id ?? null);
  return (
    <Dialog title={title} description={description} busy={busy} onClose={onClose}>
      <form
        className={DIALOG_FORM}
        onSubmit={(event) => {
          event.preventDefault();
          if (changed && !busy) onSave(draft);
        }}
      >
        <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
          <p className="lbl mb-1.5">Mazzo</p>
          {draft ? (
            <div className="flex h-12 items-center justify-between gap-3 rounded-lg border border-ink/15 bg-surface pr-1 pl-3">
              <span className="flex min-w-0 items-center gap-2 text-[15px] font-medium">
                <span className="truncate">{archetypeLabel(draft.name)}</span>
                <ManaCost archetype={draft} small />
              </span>
              <button type="button" className={BUTTON_DANGER} disabled={busy} onClick={() => setDraft(null)}>
                Rimuovi
              </button>
            </div>
          ) : (
            <ArchetypePicker archetypes={archetypes} admin autoFocus onPick={(a) => setDraft(a)} />
          )}
        </div>
        <DialogFooter>
          <button type="submit" className={BUTTON_PRIMARY} disabled={!changed || busy}>
            {busy ? "Salvo…" : "Salva"}
          </button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export function PlayersTable({ players, onPick }: { players: Player[]; onPick: (seat: Seat) => void }) {
  const [query, setQuery] = useState("");
  const typed = normalize(query);
  const shown = players.filter((p) => normalize(`${p.name} ${p.username}`).includes(typed));
  const { rows, pager } = usePage(shown);
  return (
    <section>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cerca giocatore"
        aria-label="Cerca giocatore"
        className={`${CONTROL} mb-3 sm:max-w-xs`}
      />
      <div className="card overflow-hidden">
        {/* On a phone the player takes what room there is and the deck sits on the right. */}
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,auto)] gap-3 border-b border-ink/8 bg-ink/[0.015] px-3 py-2 text-[13px] text-ink/50 sm:grid-cols-[1.2fr_1fr_100px] sm:gap-4 sm:px-4">
          <span>Giocatore</span>
          <span className="text-right sm:text-left">Mazzo</span>
          <span className="hidden sm:block">Fonte</span>
        </div>
        <ul className="divide-y divide-ink/8">
          {rows.map((p) => (
            <li key={p.team_id}>
              <button
                type="button"
                onClick={() => onPick(p)}
                className="grid min-h-10 w-full grid-cols-[minmax(0,1fr)_minmax(0,auto)] items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-ink/[0.02] sm:grid-cols-[1.2fr_1fr_100px] sm:gap-4 sm:px-4"
              >
                <span className="min-w-0">
                  <span className={`flex items-center gap-2 text-[15px] font-medium ${p.dropped ? "text-ink/40" : ""}`}>
                    <span className="truncate">{p.name}</span>
                    {p.dropped && <Badge>Ritirato</Badge>}
                  </span>
                  {p.username && <span className="block truncate text-[13px] text-ink/45">{p.username}</span>}
                </span>
                <span className={`max-w-[45vw] truncate text-right text-[15px] sm:max-w-none sm:text-left ${p.declaration ? "" : "text-ink/35"}`}>
                  {p.declaration ? archetypeLabel(p.declaration.archetype_name) : "—"}
                </span>
                <span className="hidden text-[13px] text-ink/50 sm:block">
                  {p.declaration ? (p.declaration.source === "player" ? "Giocatore" : "Admin") : ""}
                </span>
              </button>
            </li>
          ))}
          {shown.length === 0 && (
            <li>
              <EmptyState>Nessun giocatore trovato.</EmptyState>
            </li>
          )}
        </ul>
        <Pagination {...pager} />
      </div>
    </section>
  );
}

/**
 * Make a tappa the tournament in progress: declarations open on its Melee
 * tournament. Only a tappa with one can be, which the backend checks too.
 */
export function startTappa(call: ReturnType<typeof useAdmin>["call"], eventId: number) {
  return call<View["tournament"]>("/api/admin/declarations/open", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_id: eventId }),
  });
}

/**
 * Which tappa is in progress, and the switch to another. Only tappe with
 * their Melee tournament and no results yet can be picked: the pairings, the
 * roster and the decks' way into the results all go through it.
 */
export function TappaSelect({
  current,
  busy,
  onSelect,
  children,
}: {
  current: View["tournament"];
  busy: boolean;
  onSelect: (eventId: number) => Promise<boolean>;
  /** The tournament's state and settings, under the tappa. */
  children?: React.ReactNode;
}) {
  const { events, season } = useAdmin();
  const tappa = current?.event_id ? events.find((e) => e.id === current.event_id) : undefined;
  // The active season's tappe that could be played tonight, nearest first.
  const [now] = useState(() => Date.now());
  const candidates = events
    .filter((e) => e.season_id === season?.id && e.melee_tournament_id && !e.has_results && e.id !== tappa?.id)
    .sort((a, b) => Math.abs(Date.parse(a.played_at) - now) - Math.abs(Date.parse(b.played_at) - now));
  const missing = events.filter((e) => e.season_id === season?.id && !e.melee_tournament_id && !e.has_results).length;
  const [picked, setPicked] = useState<string>("");
  const choice = picked || (candidates[0] ? String(candidates[0].id) : "");

  return (
    <section className="card mb-6 p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="lbl">Tappa in corso</p>
          {current ? (
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-[17px]">
              {tappa ? (
                <Link href={`/admin/events/${tappa.id}`} className="font-semibold hover:text-accent">
                  {tappaTitle(tappa.name)}
                </Link>
              ) : (
                <span className="font-semibold">{tappaTitle(current.name)}</span>
              )}
              <a
                href={meleeTournamentUrl(current.id)}
                target="_blank"
                rel="noopener"
                className="tn text-[14px] text-ink/45 hover:text-ink"
              >
                Melee {current.id} ↗
              </a>
            </p>
          ) : (
            <p className="mt-1 text-[16px] text-ink/60">Nessuna: scegline una per aprire la raccolta dei mazzi.</p>
          )}
        </div>
        {candidates.length > 0 && (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={async (event) => {
              event.preventDefault();
              if (choice && (await onSelect(Number(choice)))) setPicked("");
            }}
          >
            <select
              aria-label="Tappa da mettere in corso"
              value={choice}
              onChange={(e) => setPicked(e.target.value)}
              disabled={busy}
              className={`${CONTROL} w-auto max-w-72`}
            >
              {candidates.map((e) => (
                <option key={e.id} value={e.id}>
                  {tappaTitle(e.name)} · {displayDate(e.played_at)}
                </option>
              ))}
            </select>
            <button type="submit" className={current ? BUTTON : BUTTON_PRIMARY} disabled={busy || !choice}>
              {current ? "Cambia tappa" : "Metti in corso"}
            </button>
          </form>
        )}
      </div>
      {candidates.length === 0 && !current && (
        <p className="mt-3 text-[15px] text-ink/60">
          Nessuna tappa della stagione ha il suo ID Melee.{" "}
          <Link href="/admin/events" className="font-semibold text-accent hover:underline">
            Aggiungilo dalla tappa
          </Link>{" "}
          e torna qui.
        </p>
      )}
      {missing > 0 && !current && candidates.length > 0 && (
        <p className="mt-3 text-[13px] text-ink/50">
          {missing === 1 ? "Una tappa non ha" : `${missing} tappe non hanno`} ancora l&apos;ID Melee e non si può
          mettere in corso.
        </p>
      )}
      {children}
    </section>
  );
}

/** Every registered player with their archetype; missing ones are Non Disponibile. */
export function exportCsv(view: View) {
  const quote = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [
    ["Giocatore", "Username Melee", "ID registrazione", "Archetipo", "ID archetipo LPI", "Fonte", "Ritirato"],
    ...view.players.map((p) => [
      p.name,
      p.username,
      p.registration_id,
      p.declaration?.archetype_name ?? UNAVAILABLE,
      p.declaration?.archetype_id ?? "",
      p.declaration ? (p.declaration.source === "player" ? "giocatore" : "admin") : "",
      p.dropped ? "sì" : "",
    ]),
  ];
  const csv = rows.map((r) => r.map(quote).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `mazzi-${view.tournament?.id ?? "torneo"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
