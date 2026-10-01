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
  BUTTON_GHOST,
  BUTTON_PRIMARY,
  ConfirmDialog,
  Dialog,
  DialogBody,
  EmptyState,
  notify,
  PageHeader,
} from "../dashboardUi";

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
  full: "bg-[#1f9d55] text-white border-[#1f9d55]",
  partial: "bg-[#f59e0b] text-white border-[#f59e0b]",
  empty: "bg-ink/[0.06] text-ink/60 border-ink/10",
};

/** Byes ride along as a last pseudo-table numbered 0. */
const BYE = 0;

function tableTitle(n: number) {
  return n === BYE ? "Bye" : `Tavolo ${n}`;
}

const REFRESH_MS = 20_000;

type Modal =
  | { kind: "pick"; seat: Seat }
  | { kind: "grid" }
  | { kind: "players" }
  | { kind: "open" }
  | { kind: "close" };

/**
 * The organiser's round of the room: one table at a time, both players side
 * by side, a deck for each, then on to the next table that still misses one.
 * The same page shows what players declared themselves, so walking the room is
 * only needed for the ones who didn't.
 */
export default function DeclarationsPage() {
  const { call } = useAdmin();
  const [view, setView] = useState<View | null>(null);
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [error, setError] = useState<AdminError | null>(null);
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
    void fetch("/api/dichiara/archetypes")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: Archetype[]) => setArchetypes(list))
      .catch(() => setArchetypes([]));
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

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
    if (roundRef.current !== null && roundRef.current !== round) notify(`Nuovo turno: ${round}. Riparti dal primo tavolo incompleto.`);
    roundRef.current = round;
    const first = walk.find((t) => fillOf(t) !== "full") ?? walk[0];
    setAt(first.number);
  }, [walk, view, at]);

  const index = at === "end" ? walk.length : walk.findIndex((t) => t.number === at);
  const table = index >= 0 && index < walk.length ? walk[index] : null;

  function next() {
    const after = walk.slice(index + 1).find((t) => fillOf(t) !== "full");
    setAt(after ? after.number : "end");
    window.scrollTo({ top: 0 });
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
    const declaration = archetype && res.ok ? (res.data as Declaration) : null;
    setView((v) => (v ? withDeclaration(v, seat.team_id, declaration) : v));
    setModal(null);
    void load();
  }

  async function openTournament(id: number) {
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
    roundRef.current = null;
    setAt(null);
    notify("Dichiarazioni aperte: i giocatori possono usare legapaupermilano.it/dichiara");
    await load();
  }

  async function closeDeclarations() {
    setBusy(true);
    const res = await call("/api/admin/declarations/close", { method: "POST" });
    setBusy(false);
    setModal(null);
    if (!res.ok) setError(res.error);
    else {
      notify("Dichiarazioni chiuse: i giocatori non possono più dichiarare né cancellare. Tu puoi ancora modificare.");
      await load();
    }
  }

  if (!view) {
    return error ? <ErrorPanel error={error} /> : <p className="py-16 text-center text-sm text-ink/50">Caricamento…</p>;
  }

  const t = view.tournament;
  const active = view.players.filter((p) => !p.dropped);
  const declaredCount = active.filter((p) => p.declaration).length;

  return (
    <div className="pb-28">
      <PageHeader
        title="Mazzi"
        badge={t && <Badge tone={t.open ? "accent" : "muted"}>{t.open ? "Aperte" : "Chiuse"}</Badge>}
        meta={
          t ? (
            <>
              {t.name}
              {view.round && view.round.number > 0 && ` · Turno ${view.round.number}`}
              {` · ${declaredCount}/${active.length} dichiarati`}
            </>
          ) : (
            "Apri le dichiarazioni per il torneo di oggi"
          )
        }
        actions={
          t && (
            <>
              <button type="button" className={BUTTON} onClick={() => setModal({ kind: "grid" })} disabled={walk.length === 0}>
                Tavoli
              </button>
              <button type="button" className={BUTTON} onClick={() => setModal({ kind: "players" })}>
                Giocatori
              </button>
              <button type="button" className={BUTTON_GHOST} onClick={() => exportCsv(view)}>
                CSV
              </button>
              {t.open ? (
                <button type="button" className={BUTTON_DANGER} onClick={() => setModal({ kind: "close" })}>
                  Chiudi
                </button>
              ) : (
                <button type="button" className={BUTTON_GHOST} disabled={busy} onClick={() => void openTournament(t.id)}>
                  Riapri
                </button>
              )}
              <button type="button" className={BUTTON_GHOST} onClick={() => setModal({ kind: "open" })}>
                Altro torneo
              </button>
            </>
          )
        }
      />

      {error && (
        <div className="mb-6">
          <ErrorPanel error={error} />
        </div>
      )}

      {!t ? (
        <TournamentList call={call} busy={busy} onOpen={(id) => void openTournament(id)} />
      ) : walk.length === 0 ? (
        <section className="card">
          <EmptyState>
            {view.round && view.round.number > 0 && !view.round.published
              ? `Gli abbinamenti del turno ${view.round.number} non sono ancora pubblicati su Melee.`
              : "Il primo turno non è ancora abbinato. Intanto puoi inserire i mazzi da Giocatori."}
          </EmptyState>
        </section>
      ) : table ? (
        <TableCard
          table={table}
          position={`${index + 1} / ${walk.length}`}
          archetypes={archetypes}
          onPick={(seat) => setModal({ kind: "pick", seat })}
        />
      ) : (
        <EndCard
          walk={walk}
          onGo={(n) => setAt(n)}
        />
      )}

      {walk.length > 0 && t && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink/8 bg-white/85 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-[1080px] items-center gap-2 px-4 py-3 sm:px-6">
            <button type="button" className={`${BUTTON} h-12 px-4`} onClick={previous} disabled={index <= 0} aria-label="Tavolo precedente">
              ←
            </button>
            <button type="button" className={`${BUTTON} h-12`} onClick={() => setModal({ kind: "grid" })}>
              Tavoli
            </button>
            <button
              type="button"
              className={`${BUTTON_PRIMARY} h-12 flex-1 text-[15px]`}
              onClick={next}
              disabled={at === "end"}
            >
              {table && fillOf(table) !== "full" ? "Salta →" : "Avanti →"}
            </button>
          </div>
        </div>
      )}

      {modal?.kind === "pick" && (
        <Dialog
          title={modal.seat.name}
          description={
            modal.seat.declaration
              ? `Ora: ${modal.seat.declaration.archetype_name} (${modal.seat.declaration.source === "player" ? "dichiarato dal giocatore" : "inserito da un admin"})`
              : "Nessun mazzo dichiarato"
          }
          busy={busy}
          onClose={() => setModal(null)}
        >
          <div className="flex min-h-0 flex-1 flex-col px-6 py-5">
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

      {modal?.kind === "grid" && (
        <Dialog title="Tavoli" description={`Turno ${view.round?.number ?? "—"}`} onClose={() => setModal(null)}>
          <DialogBody>
            <div className="flex flex-wrap gap-3 text-[12px] font-semibold text-ink/60">
              <Legend fill="full">Completo</Legend>
              <Legend fill="partial">Manca uno</Legend>
              <Legend fill="empty">Nessuno</Legend>
            </div>
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
              {walk.map((w) => (
                <button
                  key={w.number}
                  type="button"
                  onClick={() => {
                    setAt(w.number);
                    setModal(null);
                  }}
                  className={`tn h-12 rounded-xl border text-[15px] font-extrabold transition hover:brightness-105 ${FILL_SKIN[fillOf(w)]} ${
                    w.number === at ? "ring-2 ring-ink ring-offset-2" : ""
                  }`}
                >
                  {w.number === BYE ? "Bye" : w.number}
                </button>
              ))}
            </div>
          </DialogBody>
        </Dialog>
      )}

      {modal?.kind === "players" && (
        <PlayersDialog
          players={view.players}
          onClose={() => setModal(null)}
          onPick={(seat) => setModal({ kind: "pick", seat })}
        />
      )}

      {modal?.kind === "open" && (
        <Dialog title="Apri le dichiarazioni" description="Si chiude il torneo aperto adesso, se c'è." busy={busy} onClose={() => setModal(null)}>
          <DialogBody>
            <TournamentList call={call} busy={busy} onOpen={(id) => void openTournament(id)} />
          </DialogBody>
        </Dialog>
      )}

      {modal?.kind === "close" && (
        <ConfirmDialog
          title="Chiudere le dichiarazioni?"
          confirmLabel="Chiudi"
          busy={busy}
          onCancel={() => setModal(null)}
          onConfirm={() => void closeDeclarations()}
        >
          I giocatori non potranno più dichiarare o cancellare il proprio mazzo. Tu potrai ancora modificarli tutti, e
          riaprire quando vuoi.
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

function TableCard({
  table,
  position,
  archetypes,
  onPick,
}: {
  table: Table;
  position: string;
  archetypes: Archetype[];
  onPick: (seat: Seat) => void;
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="tn text-[40px] font-extrabold leading-none tracking-[-0.03em]">{tableTitle(table.number)}</h2>
        <span className="tn text-[13px] font-semibold text-ink/45">{position}</span>
      </div>
      <div className={`grid gap-3 ${table.seats.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
        {table.seats.map((seat) => {
          const d = seat.declaration;
          const archetype = d ? archetypes.find((a) => a.id === d.archetype_id) : undefined;
          return (
            <button
              key={seat.team_id}
              type="button"
              onClick={() => onPick(seat)}
              className={`flex min-h-[180px] flex-col justify-between rounded-[22px] border-2 p-4 text-left transition hover:brightness-[0.98] ${
                d ? "border-[#1f9d55]/40 bg-[#effaf3]" : "border-dashed border-ink/20 bg-white"
              }`}
            >
              <span className="text-[17px] font-extrabold leading-tight break-words">{seat.name}</span>
              <span>
                {d ? (
                  <>
                    <span className="flex flex-wrap items-center gap-1.5 text-[16px] font-extrabold leading-tight text-[#14663a]">
                      {d.archetype_name}
                      {archetype && <ManaCost archetype={archetype} />}
                    </span>
                    <span className="mt-1 block text-[11px] font-bold uppercase tracking-wider text-ink/40">
                      {d.source === "player" ? "Dal giocatore" : "Da admin"} · Cambia
                    </span>
                  </>
                ) : (
                  <span className="inline-flex h-10 items-center rounded-xl bg-ink px-3.5 text-[14px] font-bold text-white">
                    Scegli mazzo
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function EndCard({ walk, onGo }: { walk: Table[]; onGo: (n: number) => void }) {
  const missing = walk.filter((t) => fillOf(t) !== "full");
  return (
    <section className="card p-6 text-center">
      <p className="text-[22px] font-extrabold">{missing.length === 0 ? "Tutti i tavoli sono completi" : "Fine dei tavoli"}</p>
      {missing.length > 0 && (
        <>
          <p className="mt-1 text-sm text-ink/55">
            {missing.length === 1 ? "Manca ancora un tavolo:" : `Mancano ancora ${missing.length} tavoli:`}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {missing.map((t) => (
              <button
                key={t.number}
                type="button"
                onClick={() => onGo(t.number)}
                className={`tn h-11 min-w-11 rounded-xl border px-3 text-[15px] font-extrabold ${FILL_SKIN[fillOf(t)]}`}
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

function Legend({ fill, children }: { fill: Fill; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded-full border ${FILL_SKIN[fill]}`} />
      {children}
    </span>
  );
}

function PlayersDialog({
  players,
  onClose,
  onPick,
}: {
  players: Player[];
  onClose: () => void;
  onPick: (seat: Seat) => void;
}) {
  const [query, setQuery] = useState("");
  const shown = players.filter((p) => normalize(p.name).includes(normalize(query)));
  return (
    <Dialog title="Giocatori" description={`${players.filter((p) => p.declaration).length} di ${players.length} con un mazzo`} onClose={onClose}>
      <div className="flex min-h-0 flex-1 flex-col px-6 py-5">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca giocatore"
          className="w-full rounded-xl border-[1.5px] border-ink/15 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-accent"
        />
        <ul className="mt-3 min-h-0 flex-1 divide-y divide-ink/8 overflow-y-auto">
          {shown.map((p) => (
            <li key={p.team_id}>
              <button
                type="button"
                onClick={() => onPick(p)}
                className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-ink/[0.02]"
              >
                <span className="min-w-0">
                  <span className={`block truncate text-[14px] font-bold ${p.dropped ? "text-ink/40 line-through" : ""}`}>{p.name}</span>
                  <span className="block truncate text-[12px] text-ink/45">{p.username}</span>
                </span>
                <span className={`shrink-0 text-[13px] font-semibold ${p.declaration ? "text-[#14663a]" : "text-ink/35"}`}>
                  {p.declaration?.archetype_name ?? "—"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  );
}

function TournamentList({
  call,
  busy,
  onOpen,
}: {
  call: ReturnType<typeof useAdmin>["call"];
  busy: boolean;
  onOpen: (id: number) => void;
}) {
  const [list, setList] = useState<TournamentChoice[] | null>(null);
  const [error, setError] = useState<AdminError | null>(null);

  useEffect(() => {
    let cancelled = false;
    void call<TournamentChoice[]>("/api/admin/declarations/tournaments").then((res) => {
      if (cancelled) return;
      if (res.ok) setList(res.data);
      else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [call]);

  if (error) return <ErrorPanel error={error} />;
  if (!list) return <p className="py-8 text-center text-sm text-ink/50">Cerco i tornei su Melee…</p>;
  if (list.length === 0) {
    return (
      <section className="card">
        <EmptyState>Nessun torneo Melee tra tre giorni fa e la prossima settimana.</EmptyState>
      </section>
    );
  }
  return (
    <ul className="card divide-y divide-ink/8">
      {list.map((t) => (
        <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold">{t.name}</p>
            <p className="text-[12px] text-ink/50">{t.status || "—"}</p>
          </div>
          <button type="button" className={BUTTON_PRIMARY} disabled={busy} onClick={() => onOpen(t.id)}>
            Apri
          </button>
        </li>
      ))}
    </ul>
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
