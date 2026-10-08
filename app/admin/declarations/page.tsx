"use client";

import Link from "next/link";
import { useState } from "react";
import { ErrorPanel } from "../ErrorPanel";
import { BUTTON, BUTTON_PRIMARY, PageHeader, Segmented } from "../dashboardUi";
import {
  DeckPickerDialog,
  exportCsv,
  PlayersTable,
  Stat,
  TappaSelect,
  useDeclarations,
  type Seat,
} from "./shared";

type Modal = { kind: "pick"; seat: Seat };

/**
 * The decks of the tournament in progress, in the dashboard: the tournament
 * set by its Melee id, a status line with the
 * round, how many players have a deck and whether they can still pick one
 * from /mazzo, then every player with their deck. Walking the room table by
 * table happens on its own page, opened from "Inserisci ai tavoli".
 */
export default function DeclarationsPage() {
  const { view, archetypes, error, busy, walk, setDeck, openTappa, closeDeclarations, setFindBy } =
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

      <TappaSelect current={t} busy={busy} onSelect={openTappa}>
        {t && (
          <>
            <div className="mt-5 flex flex-wrap gap-x-10 gap-y-3 border-t border-ink/8 pt-5">
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
                <span className="ml-2 inline-block h-1.5 w-24 overflow-hidden rounded-full bg-ink/10 align-middle">
                  <span
                    className="block h-full rounded-full bg-accent"
                    style={{ width: active.length ? `${(declaredCount / active.length) * 100}%` : 0 }}
                  />
                </span>
              </Stat>
            </div>
            <div className="mt-5 divide-y divide-ink/8 border-t border-ink/8">
              {/* The descriptions cover both choices, so switching doesn't move the page. */}
              <Setting
                title="Raccolta mazzi"
                description="Attiva, sul sito compare il pulsante «il mio mazzo» e i giocatori indicano il proprio. Disattivata, il pulsante sparisce e i mazzi li modifichi solo tu."
              >
                <Segmented
                  value={t.open ? "on" : "off"}
                  options={[
                    { value: "on", label: "Attiva" },
                    { value: "off", label: "Disattiva" },
                  ]}
                  // A tournament opened before tappe had their Melee id can only be turned off.
                  disabled={busy || (!t.open && !t.event_id)}
                  label="Raccolta mazzi"
                  onChange={(v) => (v === "off" ? closeDeclarations() : t.event_id ? openTappa(t.event_id, true) : Promise.resolve(false))}
                />
              </Setting>
              <Setting
                title="Modalità di inserimento"
                description="Come i giocatori si trovano su /mazzo: dal numero del loro tavolo, o cercando il proprio nome tra gli iscritti."
              >
                <Segmented
                  value={findBy}
                  options={[
                    { value: "table", label: "Per tavolo" },
                    { value: "name", label: "Per nome" },
                  ]}
                  disabled={busy}
                  label="Modalità di inserimento"
                  onChange={setFindBy}
                />
              </Setting>
            </div>
          </>
        )}
      </TappaSelect>

      {t && (
        <>
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

    </div>
  );
}

/** One setting of the tournament: what it is and does on the left, the control on the right. */
function Setting({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-4 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="min-w-0 max-w-xl flex-1">
        <p className="text-[16px] font-semibold">{title}</p>
        <p className="mt-0.5 text-[14px] leading-relaxed text-ink/55">{description}</p>
      </div>
      {children}
    </div>
  );
}
