"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AdminError } from "@/app/lib/adminTypes";
import { ArchetypePicker, ManaCost } from "@/app/components/ArchetypePicker";
import { normalize, UNAVAILABLE, type Archetype } from "@/app/lib/decks";
import { useAdmin } from "../AdminShell";
import { ErrorPanel } from "../ErrorPanel";
import {
  Badge,
  BUTTON,
  BUTTON_DANGER,
  BUTTON_PRIMARY,
  ConfirmDialog,
  Dialog,
  EmptyState,
  notify,
  PageHeader,
  Pagination,
  usePage,
} from "../dashboardUi";
import { CONTROL } from "../fields";

type Declaration = {
  team_id: number;
  registration_id: number;
  username: string;
  player_name: string;
  archetype_id: number;
  archetype_name: string;
  source: "player" | "admin";
};

type Seat = {
  team_id: number;
  registration_id: number;
  username: string;
  name: string;
  declaration: Declaration | null;
};

type Player = Seat & { dropped: boolean };

type Table = { number: number; seats: Seat[] };

type View = {
  tournament: { id: number; name: string; opened_at: string; closed_at: string | null; open: boolean } | null;
  round: { number: number; published: boolean; tables: Table[]; byes: Seat[] } | null;
  players: Player[];
};

type TournamentChoice = { id: number; name: string; status: string };

/** How far a table is: every seat declared, some, or none. */
type Fill = "full" | "partial" | "empty";

function fillOf(table: Table): Fill {
  const declared = table.seats.filter((s) => s.declaration).length;
  return declared === table.seats.length ? "full" : declared > 0 ? "partial" : "empty";
}

const FILL_SKIN: Record<Fill, string> = {
  full: "border-[#22c55e]/35 bg-[#22c55e]/15 text-[#4ade80]",
  partial: "border-[#f59e0b]/40 bg-[#f59e0b]/15 text-[#fbbf24]",
  empty: "border-ink/12 bg-surface text-ink/55",
};

const FILL_LABEL: Record<Fill, string> = {
  full: "completo",
  partial: "manca un mazzo",
  empty: "nessun mazzo",
};

/** Byes ride along as a last pseudo-table numbered 0. */
const BYE = 0;

function tableTitle(n: number) {
  return n === BYE ? "Bye" : `Tavolo ${n}`;
}

const REFRESH_MS = 20_000;

type Tab = "tables" | "players";

type Modal = { kind: "pick"; seat: Seat } | { kind: "close" };

/**
 * Deck declarations for the current tournament. A status line says which
 * round it is, how many players have declared and whether players can still
 * declare from /dichiara. Above it, the tournament selector: today's Melee
 * tournament opens by itself, and any other can be picked there. Below, Tavoli
 * walks the room one table at a time, jumping to the next one that misses a
 * deck; Giocatori lists everyone, including players not paired this round.
 */
export default function DeclarationsPage() {
  const { call } = useAdmin();
  const [view, setView] = useState<View | null>(null);
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [error, setError] = useState<AdminError | null>(null);
  const [tab, setTab] = useState<Tab>("tables");
  const [at, setAt] = useState<number | "end" | null>(null);
  const [modal, setModal] = useState<Modal | null>(null);
  const [busy, setBusy] = useState(false);
  const roundRef = useRef<number | null>(null);

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

  // Start at the first table missing a deck, and again whenever a new round
  // is paired, since the old table numbers mean nothing any more.
  useEffect(() => {
    const round = view?.round?.number ?? null;
    if (walk.length === 0) return;
    if (roundRef.current === round && at !== null) return;
    if (roundRef.current !== null && roundRef.current !== round) {
      notify(`Turno ${round} abbinato: riparti dal primo tavolo incompleto.`);
    }
    roundRef.current = round;
    const first = walk.find((t) => fillOf(t) !== "full") ?? walk[0];
    setAt(first.number);
  }, [walk, view, at]);

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
      return;
    }
    // Show it at once; the reload that follows brings the rest up to date.
    const declaration = archetype ? (res.data as Declaration) : null;
    setView((v) => (v ? withDeclaration(v, seat.team_id, declaration) : v));
    setModal(null);
    void load();
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
      return;
    }
    setModal(null);
    if (!reopening) {
      roundRef.current = null;
      setAt(null);
    }
    notify(reopening ? "I giocatori possono di nuovo dichiarare." : "Dichiarazioni aperte per il torneo scelto.");
    await load();
  }

  async function closeDeclarations() {
    setBusy(true);
    const res = await call("/api/admin/declarations/close", { method: "POST" });
    setBusy(false);
    setModal(null);
    if (!res.ok) setError(res.error);
    else {
      notify("Dichiarazioni chiuse ai giocatori. Tu puoi ancora modificarle.");
      await load();
    }
  }

  if (!view) {
    return error ? <ErrorPanel error={error} /> : <p className="py-16 text-center text-[13px] text-ink/50">Caricamento…</p>;
  }

  const t = view.tournament;
  const active = view.players.filter((p) => !p.dropped);
  const declaredCount = active.filter((p) => p.declaration).length;

  return (
    <div>
      <PageHeader
        title="Dichiarazioni"
        meta="I mazzi che i giocatori dichiarano durante il torneo."
        actions={
          t && (
            <button type="button" className={BUTTON} onClick={() => exportCsv(view)}>
              Esporta CSV
            </button>
          )
        }
      />

      {error && (
        <div className="mb-5">
          <ErrorPanel error={error} />
        </div>
      )}

      <div className="mb-4">
        <p className="lbl mb-1.5">Torneo</p>
        <TournamentSelect call={call} current={t} busy={busy} onSelect={(id) => void openTournament(id)} />
        {!t && (
          <p className="mt-2 text-[12px] text-ink/50">
            Il torneo Melee di oggi si apre da solo. Se non compare, sceglilo qui.
          </p>
        )}
      </div>

      {t && (
        <>
          <section className="card mb-5 flex flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3">
            <Stat label="Turno">
              {view.round && view.round.number > 0 ? view.round.number : "—"}
              {view.round && view.round.number > 0 && !view.round.published && (
                <span className="ml-1.5 text-[12px] font-normal text-ink/50">non pubblicato</span>
              )}
            </Stat>
            <Stat label="Dichiarati">
              <span className="tn">
                {declaredCount}/{active.length}
              </span>
              <span className="ml-2 inline-block h-1.5 w-20 overflow-hidden rounded-full bg-ink/10 align-middle">
                <span
                  className="block h-full rounded-full bg-accent"
                  style={{ width: active.length ? `${(declaredCount / active.length) * 100}%` : 0 }}
                />
              </span>
            </Stat>
            <div className="flex items-center gap-3 sm:ml-auto">
              <Switch
                checked={t.open}
                disabled={busy}
                label="Aperte ai giocatori"
                onChange={() => (t.open ? setModal({ kind: "close" }) : void openTournament(t.id, true))}
              />
              <div>
                <p className="text-[13px] font-medium">{t.open ? "Aperte ai giocatori" : "Chiuse ai giocatori"}</p>
                <p className="text-[12px] text-ink/50">
                  {t.open ? "Dichiarano da legapaupermilano.it/dichiara" : "Solo gli admin possono modificare"}
                </p>
              </div>
            </div>
          </section>

          <div className="mb-4 flex gap-5 border-b border-ink/10" role="tablist">
            <TabButton active={tab === "tables"} onClick={() => setTab("tables")} count={walk.length}>
              Tavoli
            </TabButton>
            <TabButton active={tab === "players"} onClick={() => setTab("players")} count={view.players.length}>
              Giocatori
            </TabButton>
          </div>

          {tab === "tables" &&
            (walk.length === 0 ? (
              <section className="card">
                <EmptyState>
                  {view.round && view.round.number > 0 && !view.round.published
                    ? `Gli abbinamenti del turno ${view.round.number} non sono ancora pubblicati su Melee.`
                    : "Il primo turno non è ancora abbinato. Intanto puoi assegnare i mazzi da Giocatori."}
                </EmptyState>
              </section>
            ) : (
              <>
                <TableStrip walk={walk} at={at} onGo={setAt} />
                {table ? (
                  <TableCard
                    table={table}
                    position={`${index + 1} di ${walk.length}`}
                    archetypes={archetypes}
                    onPick={(seat) => setModal({ kind: "pick", seat })}
                    footer={
                      <>
                        <button type="button" className={BUTTON} onClick={previous} disabled={index <= 0}>
                          ← Precedente
                        </button>
                        <button type="button" className={BUTTON_PRIMARY} onClick={next}>
                          {fillOf(table) === "full" ? "Avanti →" : "Salta →"}
                        </button>
                      </>
                    }
                  />
                ) : (
                  <EndCard walk={walk} onGo={setAt} />
                )}
              </>
            ))}

          {tab === "players" && <PlayersTable players={view.players} onPick={(seat) => setModal({ kind: "pick", seat })} />}
        </>
      )}

      {modal?.kind === "pick" && (
        <Dialog
          title={modal.seat.name}
          description={
            modal.seat.declaration
              ? `Ora: ${modal.seat.declaration.archetype_name} (${modal.seat.declaration.source === "player" ? "dal giocatore" : "da un admin"})`
              : "Nessun mazzo dichiarato"
          }
          busy={busy}
          onClose={() => setModal(null)}
        >
          <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
            <ArchetypePicker
              archetypes={archetypes}
              admin
              autoFocus
              selectedId={modal.seat.declaration?.archetype_id}
              onPick={(a) => void setDeck(modal.seat, a)}
            />
            {modal.seat.declaration && (
              <button
                type="button"
                className={`${BUTTON_DANGER} mt-3 self-start`}
                disabled={busy}
                onClick={() => void setDeck(modal.seat, null)}
              >
                Rimuovi dichiarazione
              </button>
            )}
          </div>
        </Dialog>
      )}

      {modal?.kind === "close" && (
        <ConfirmDialog
          title="Chiudere le dichiarazioni ai giocatori?"
          confirmLabel="Chiudi"
          busy={busy}
          onCancel={() => setModal(null)}
          onConfirm={() => void closeDeclarations()}
        >
          I giocatori non potranno più dichiarare o cancellare il proprio mazzo da /dichiara. Tu potrai ancora
          modificarli tutti, e riaprire quando vuoi.
        </ConfirmDialog>
      )}
    </div>
  );
}

function withDeclaration(view: View, teamId: number, declaration: Declaration | null): View {
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

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[12px] text-ink/50">{label}</p>
      <p className="mt-0.5 text-[15px] font-semibold">{children}</p>
    </div>
  );
}

function Switch({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-[18px] w-8 shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? "bg-accent" : "bg-ink/15"}`}
    >
      <span
        className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-[left] ${
          checked ? "left-[16px]" : "left-[2px]"
        }`}
      />
    </button>
  );
}

function TabButton({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`-mb-px flex h-9 items-center gap-1.5 border-b-2 text-[13px] font-medium transition-colors ${
        active ? "border-accent text-ink" : "border-transparent text-ink/55 hover:text-ink"
      }`}
    >
      {children}
      <span className="tn text-[12px] text-ink/40">{count}</span>
    </button>
  );
}

/** Every table of the round, colored by how many decks are in; tap to go there. */
function TableStrip({ walk, at, onGo }: { walk: Table[]; at: number | "end" | null; onGo: (n: number) => void }) {
  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-1">
        {walk.map((w) => (
          <button
            key={w.number}
            type="button"
            onClick={() => onGo(w.number)}
            aria-label={`${tableTitle(w.number)}: ${FILL_LABEL[fillOf(w)]}`}
            aria-current={w.number === at ? "true" : undefined}
            className={`tn h-7 min-w-8 rounded border px-1.5 text-[12px] font-medium transition ${FILL_SKIN[fillOf(w)]} ${
              w.number === at ? "ring-2 ring-ink/70 ring-offset-1 ring-offset-page" : "hover:brightness-95"
            }`}
          >
            {w.number === BYE ? "Bye" : w.number}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-[12px] text-ink/50">
        <Legend fill="full">Completo</Legend>
        <Legend fill="partial">Manca un mazzo</Legend>
        <Legend fill="empty">Nessun mazzo</Legend>
      </div>
    </div>
  );
}

function Legend({ fill, children }: { fill: Fill; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-sm border ${FILL_SKIN[fill]}`} />
      {children}
    </span>
  );
}

function TableCard({
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
      <div className={`grid divide-ink/8 ${table.seats.length === 1 ? "grid-cols-1" : "grid-cols-2 divide-x"}`}>
        {table.seats.map((seat) => {
          const d = seat.declaration;
          const archetype = d ? archetypes.find((a) => a.id === d.archetype_id) : undefined;
          return (
            <button
              key={seat.team_id}
              type="button"
              onClick={() => onPick(seat)}
              className="flex min-h-[120px] flex-col justify-between gap-3 p-4 text-left transition-colors hover:bg-ink/[0.02]"
            >
              <span className="min-w-0">
                <span className="block text-[14px] font-medium break-words">{seat.name}</span>
                {seat.username && <span className="block truncate text-[12px] text-ink/45">{seat.username}</span>}
              </span>
              {d ? (
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-1.5 text-[13px] font-medium">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#22c55e]" aria-hidden />
                    {d.archetype_name}
                    {archetype && <ManaCost archetype={archetype} small />}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-ink/45">
                    {d.source === "player" ? "Dal giocatore" : "Da admin"} · Cambia
                  </span>
                </span>
              ) : (
                <span className={`${BUTTON} self-start`}>Scegli mazzo</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between gap-2 border-t border-ink/8 bg-ink/[0.015] px-4 py-2.5">{footer}</div>
    </section>
  );
}

function EndCard({ walk, onGo }: { walk: Table[]; onGo: (n: number) => void }) {
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

function PlayersTable({ players, onPick }: { players: Player[]; onPick: (seat: Seat) => void }) {
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
        className={`${CONTROL} mb-3 max-w-xs`}
      />
      <div className="card overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr] gap-4 border-b border-ink/8 bg-ink/[0.015] px-4 py-2 text-[12px] text-ink/50 sm:grid-cols-[1.2fr_1fr_100px]">
          <span>Giocatore</span>
          <span>Mazzo</span>
          <span className="hidden sm:block">Fonte</span>
        </div>
        <ul className="divide-y divide-ink/8">
          {rows.map((p) => (
            <li key={p.team_id}>
              <button
                type="button"
                onClick={() => onPick(p)}
                className="grid min-h-10 w-full grid-cols-[1fr_1fr] items-center gap-4 px-4 py-2 text-left transition-colors hover:bg-ink/[0.02] sm:grid-cols-[1.2fr_1fr_100px]"
              >
                <span className="min-w-0">
                  <span className={`flex items-center gap-2 truncate text-[13px] font-medium ${p.dropped ? "text-ink/40" : ""}`}>
                    {p.name}
                    {p.dropped && <Badge>Ritirato</Badge>}
                  </span>
                  {p.username && <span className="block truncate text-[12px] text-ink/45">{p.username}</span>}
                </span>
                <span className={`truncate text-[13px] ${p.declaration ? "" : "text-ink/35"}`}>
                  {p.declaration?.archetype_name ?? "—"}
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
 * The tournament declarations are collected for, as a dropdown of the Melee
 * tournaments from three days ago to next week. Picking another one opens
 * declarations there; the current one's are kept.
 */
function TournamentSelect({
  call,
  current,
  busy,
  onSelect,
}: {
  call: ReturnType<typeof useAdmin>["call"];
  current: View["tournament"];
  busy: boolean;
  onSelect: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<TournamentChoice[] | null>(null);
  const [error, setError] = useState<AdminError | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void call<TournamentChoice[]>("/api/admin/declarations/tournaments").then((res) => {
      if (cancelled) return;
      if (res.ok) setList(res.data);
      else setError(res.error);
    });
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, call]);

  return (
    <div ref={ref} className="relative max-w-xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-9 w-full items-center gap-2 rounded-md border border-ink/15 bg-surface px-3 text-left text-[13px] transition-colors hover:border-ink/25 disabled:opacity-60"
      >
        <span className={`min-w-0 flex-1 truncate ${current ? "font-medium" : "text-ink/45"}`}>
          {current ? current.name : "Scegli il torneo Melee"}
        </span>
        <span className="text-[11px] text-ink/40" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Tornei Melee"
          className="absolute right-0 left-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-md border border-ink/10 bg-surface p-1 shadow-[0_8px_24px_rgba(28,27,26,0.12)]"
        >
          {error ? (
            <div className="p-2">
              <ErrorPanel error={error} />
            </div>
          ) : !list ? (
            <p className="px-2 py-3 text-[13px] text-ink/50">Cerco i tornei su Melee…</p>
          ) : list.length === 0 ? (
            <p className="px-2 py-3 text-[13px] text-ink/50">Nessun torneo Melee tra tre giorni fa e la prossima settimana.</p>
          ) : (
            list.map((choice) => {
              const selected = choice.id === current?.id;
              return (
                <button
                  key={choice.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    setOpen(false);
                    if (!selected) onSelect(choice.id);
                  }}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-ink/[0.05] ${selected ? "bg-ink/[0.04]" : ""}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{choice.name}</span>
                    <span className="block text-[12px] text-ink/50">{choice.status || "—"}</span>
                  </span>
                  {selected && (
                    <span className="text-[12px] text-accent" aria-hidden>
                      ✓
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/** Every registered player with their archetype; missing ones are Non Disponibile. */
function exportCsv(view: View) {
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
