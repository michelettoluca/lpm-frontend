"use client";

import Link from "next/link";
import { useState } from "react";
import { ErrorPanel } from "../ErrorPanel";
import { BUTTON, BUTTON_PRIMARY, ConfirmDialog, EmptyState, PageHeader, Segmented, Switch } from "../dashboardUi";
import {
  DeckPickerDialog,
  exportCsv,
  PlayersTable,
  Stat,
  TournamentSelect,
  useDeclarations,
  type Seat,
} from "./shared";

type Modal = { kind: "pick"; seat: Seat } | { kind: "close" };

/**
 * The decks of the tournament in progress, in the dashboard: the tournament
 * set by its Melee id, a status line with the
 * round, how many players have a deck and whether they can still pick one
 * from /mazzo, then every player with their deck. Walking the room table by
 * table happens on its own page, opened from "Inserisci ai tavoli".
 */
export default function DeclarationsPage() {
  const { view, archetypes, error, busy, walk, setDeck, openTournament, closeDeclarations, setFindBy } =
    useDeclarations();
  const [modal, setModal] = useState<Modal | null>(null);

  if (!view) {
    return error ? <ErrorPanel error={error} /> : <p className="py-16 text-center text-[15px] text-ink/50">Caricamento…</p>;
  }

  const t = view.tournament;
  const active = view.players.filter((p) => !p.dropped);
  const declaredCount = active.filter((p) => p.declaration).length;
  const findBy = view.find_by ?? "table";

  return (
    <div>
      <PageHeader
        title="Torneo in corso"
        meta="Il mazzo di ogni giocatore del torneo di stasera: i giocatori lo indicano da /mazzo, tu completi i mancanti."
        actions={
          t && (
            <>
              <button type="button" className={BUTTON} onClick={() => exportCsv(view)}>
                Esporta CSV
              </button>
              {walk.length > 0 && (
                <Link href="/admin/declarations/tavoli" className={BUTTON_PRIMARY}>
                  Inserisci ai tavoli
                </Link>
              )}
            </>
          )
        }
      />

      {error && (
        <div className="mb-5">
          <ErrorPanel error={error} />
        </div>
      )}

      <TournamentSelect current={t} busy={busy} onSelect={openTournament} />

      {!t ? (
        <section className="card">
          <EmptyState>Inserisci qui sopra l&apos;ID del torneo Melee per vedere i giocatori e i loro mazzi.</EmptyState>
        </section>
      ) : (
        <>
          <section className="card mb-5 flex flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3">
            <Stat label="Turno">
              {view.round && view.round.number > 0 ? view.round.number : "—"}
              {view.round && view.round.number > 0 && !view.round.published && (
                <span className="ml-1.5 text-[13px] font-normal text-ink/50">non pubblicato</span>
              )}
            </Stat>
            <Stat label="Con mazzo">
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
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 sm:ml-auto">
              <div className="flex items-center gap-3">
                <p className="text-[15px] font-medium">Tipo di ricerca</p>
                <Segmented
                  value={findBy}
                  options={[
                    { value: "name", label: "Nome" },
                    { value: "table", label: "Tavolo" },
                  ]}
                  disabled={busy}
                  label="Tipo di ricerca"
                  onChange={(by) => void setFindBy(by)}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={t.open}
                  disabled={busy}
                  label="Aperte ai giocatori"
                  onChange={() => (t.open ? setModal({ kind: "close" }) : void openTournament(t.id, true))}
                />
                <div>
                  <p className="text-[15px] font-medium">{t.open ? "Aperte ai giocatori" : "Chiuse ai giocatori"}</p>
                  <p className="text-[13px] text-ink/50">
                    {t.open ? "Indicano il mazzo da legapaupermilano.it/mazzo" : "Solo gli admin possono modificare"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {walk.length === 0 && view.round && view.round.number > 0 && !view.round.published && (
            <p className="mb-3 text-[13px] text-ink/50">
              Gli abbinamenti del turno {view.round.number} non sono ancora pubblicati: i tavoli compaiono appena escono.
            </p>
          )}

          <PlayersTable players={view.players} onPick={(seat) => setModal({ kind: "pick", seat })} />
        </>
      )}

      {modal?.kind === "pick" && (
        <DeckPickerDialog
          key={modal.seat.team_id}
          seat={modal.seat}
          archetypes={archetypes}
          busy={busy}
          onClose={() => setModal(null)}
          onSave={async (archetype) => {
            if (await setDeck(modal.seat, archetype)) setModal(null);
          }}
        />
      )}

      {modal?.kind === "close" && (
        <ConfirmDialog
          title="Chiudere la raccolta dei mazzi?"
          confirmLabel="Chiudi"
          busy={busy}
          onCancel={() => setModal(null)}
          onConfirm={async () => {
            if (await closeDeclarations()) setModal(null);
          }}
        >
          I giocatori non potranno più indicare o cancellare il proprio mazzo da /mazzo. Tu potrai ancora modificarli
          tutti, e riaprire quando vuoi.
        </ConfirmDialog>
      )}
    </div>
  );
}
