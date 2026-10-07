"use client";

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
  EmptyState,
  notify,
  Pagination,
  usePage,
} from "../dashboardUi";
import { CONTROL, CONTROL_INVALID } from "../fields";
import { tappaSubtitle, tappaTitle } from "@/app/lib/format";

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
  tournament: { id: number; name: string; opened_at: string; closed_at: string | null; open: boolean } | null;
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
  const { call } = useAdmin();
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
    return res.data;
  }, [call]);

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

  async function openTournament(id: number, reopening = false) {
    setBusy(true);
    const res = await call("/api/admin/declarations/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tournament_id: id }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return false;
    }
    notify(reopening ? "I giocatori possono di nuovo indicare il mazzo." : "Raccolta dei mazzi aperta per il torneo scelto.");
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
    notify("Raccolta chiusa ai giocatori. Tu puoi ancora modificare i mazzi.");
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

  return { call, view, archetypes, error, busy, walk, setDeck, openTournament, closeDeclarations, setFindBy };
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
      <p className="text-[12px] text-ink/50">{label}</p>
      <p className="mt-0.5 text-[15px] font-semibold">{children}</p>
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
            className={`tn h-8 w-10 shrink-0 rounded border text-[12px] font-medium transition ${FILL_SKIN[fillOf(w)]} ${
              w.number === at ? "ring-2 ring-ink/70 ring-offset-1 ring-offset-page" : "hover:brightness-95"
            }`}
          >
            {w.number === BYE ? "Bye" : w.number}
          </button>
        ))}
      </div>
      {legend && (
        <div className="mt-2 flex flex-wrap gap-4 text-[12px] text-ink/50">
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
        <h2 className="text-[15px] font-semibold">{tableTitle(table.number)}</h2>
        <span className="tn text-[12px] text-ink/45">{position}</span>
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
                <span className="block text-[14px] font-medium break-words">{seat.name}</span>
                {seat.username && <span className="block truncate text-[12px] text-ink/45">{seat.username}</span>}
              </span>
              {d ? (
                <span className="min-w-0 text-right sm:text-left">
                  <span className="flex flex-wrap items-center justify-end gap-1.5 text-[13px] font-medium sm:justify-start">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#22c55e]" aria-hidden />
                    {archetypeLabel(d.archetype_name)}
                    {archetype && <ManaCost archetype={archetype} small />}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-ink/45">
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
      <p className="text-[15px] font-semibold">{missing.length === 0 ? "Tutti i tavoli sono completi" : "Fine dei tavoli"}</p>
      {missing.length > 0 && (
        <>
          <p className="mt-1 text-[13px] text-ink/55">
            {missing.length === 1 ? "Manca ancora un tavolo:" : `Mancano ancora ${missing.length} tavoli:`}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-1">
            {missing.map((t) => (
              <button
                key={t.number}
                type="button"
                onClick={() => onGo(t.number)}
                className={`tn h-7 min-w-8 rounded border px-1.5 text-[12px] font-medium ${FILL_SKIN[fillOf(t)]}`}
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
            <div className="flex h-10 items-center justify-between gap-3 rounded-md border border-ink/15 bg-surface pr-1 pl-3">
              <span className="flex min-w-0 items-center gap-2 text-[13px] font-medium">
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
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,auto)] gap-3 border-b border-ink/8 bg-ink/[0.015] px-3 py-2 text-[12px] text-ink/50 sm:grid-cols-[1.2fr_1fr_100px] sm:gap-4 sm:px-4">
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
                  <span className={`flex items-center gap-2 text-[13px] font-medium ${p.dropped ? "text-ink/40" : ""}`}>
                    <span className="truncate">{p.name}</span>
                    {p.dropped && <Badge>Ritirato</Badge>}
                  </span>
                  {p.username && <span className="block truncate text-[12px] text-ink/45">{p.username}</span>}
                </span>
                <span className={`max-w-[45vw] truncate text-right text-[13px] sm:max-w-none sm:text-left ${p.declaration ? "" : "text-ink/35"}`}>
                  {p.declaration ? archetypeLabel(p.declaration.archetype_name) : "—"}
                </span>
                <span className="hidden text-[12px] text-ink/50 sm:block">
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
 * The tournament declarations are collected for, set by its Melee id: nothing
 * is picked by date, since Melee's dates can't be trusted to tell the tappe
 * apart. The id or the tournament's melee.gg link both work. Setting another
 * one opens declarations there; the current one's are kept.
 */
export function TournamentSelect({
  current,
  busy,
  onSelect,
}: {
  current: View["tournament"];
  busy: boolean;
  onSelect: (id: number) => Promise<boolean>;
}) {
  const [text, setText] = useState("");
  const id = meleeTournamentId(text);
  const invalid = text.trim() !== "" && id === null;
  const same = id !== null && id === current?.id;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (id === null || same) return;
    if (await onSelect(id)) setText("");
  }

  return (
    <div className="mb-4">
      <p className="lbl mb-1.5">Torneo</p>
      {current && (
        <p className="mb-2 flex max-w-xl items-baseline gap-2 text-[13px]">
          <span className="min-w-0 truncate font-medium">{tappaTitle(current.name)}</span>
          {tappaTitle(current.name) !== current.name && (
            <span className="min-w-0 truncate text-[12px] text-ink/45">{tappaSubtitle(current.name)}</span>
          )}
          <span className="tn ml-auto shrink-0 text-[12px] text-ink/45">ID {current.id}</span>
        </p>
      )}
      <form onSubmit={submit} className="flex max-w-xl gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
          inputMode="url"
          aria-label="ID o link del torneo Melee"
          aria-invalid={invalid}
          placeholder={current ? "Cambia torneo: ID o link Melee" : "ID o link del torneo Melee, es. 475829"}
          className={`${CONTROL} ${invalid ? CONTROL_INVALID : ""}`}
        />
        <button type="submit" className={BUTTON_PRIMARY} disabled={busy || id === null || same}>
          Apri
        </button>
      </form>
      <p className={`mt-2 text-[12px] ${invalid ? "text-accent" : "text-ink/50"}`}>
        {invalid
          ? "Serve il numero del torneo o il suo link melee.gg/Tournament/View/…"
          : same
            ? "È già il torneo scelto."
            : "Lo trovi nel link del torneo su melee.gg, dopo /Tournament/View/."}
      </p>
    </div>
  );
}

/** "475829" or "https://melee.gg/Tournament/View/475829" → 475829; anything else → null. */
export function meleeTournamentId(text: string): number | null {
  const t = text.trim();
  const m = /^(\d+)$/.exec(t) ?? /\/Tournament\/View\/(\d+)/i.exec(t);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
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
