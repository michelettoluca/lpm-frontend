"use client";

import Link from "next/link";
import { useState } from "react";
import type { AdminError, Season } from "@/app/lib/adminTypes";
import { tappaTitle } from "@/app/lib/format";
import { useAdmin } from "./AdminShell";
import { ConfirmResetDialog } from "./ConfirmResetDialog";
import { ErrorPanel } from "./ErrorPanel";
import { EventDialog } from "./EventDialog";
import { SeasonDialog } from "./SeasonDialog";
import {
  BUTTON,
  BUTTON_PRIMARY,
  Callout,
  ConfirmDialog,
  displayDate,
  displayTime,
  EmptyState,
  MoreMenu,
  notify,
  PageHeader,
  SectionHeader,
} from "./dashboardUi";
import { EventRow, isPast, isToday, useMeleeSync, useSeasonEvents } from "./eventDisplay";
import { countedLabel, Progress, seasonPeriod, seasonStatus } from "./seasonDisplay";

/** A number worth seeing first, with what it means and, sometimes, what to do. */
function Tile({ label, children, foot }: { label: string; children: React.ReactNode; foot?: React.ReactNode }) {
  return (
    <section className="card flex min-h-[148px] flex-col p-5">
      <h2 className="lbl">{label}</h2>
      <div className="mt-2 flex-1">{children}</div>
      {foot && <div className="mt-4">{foot}</div>}
    </section>
  );
}

const BIG = "tn font-[family-name:var(--font-archivo)] text-[34px] leading-none font-bold";

/**
 * The season the sidebar points at, at a glance: how far it has got, what is
 * left to import, the next tappa and the latest ones. The season's own
 * actions (make it the site's, edit, delete) live here too.
 */
export default function OverviewPage() {
  const { season, seasons, live } = useAdmin();

  if (!season) {
    return (
      <>
        <PageHeader title="Benvenuto" meta="Il pannello della Lega Pauper Milano." />
        <Callout title="Nessuna stagione">
          Crea la prima stagione da{" "}
          <Link href="/admin/seasons" className="font-semibold text-accent underline-offset-2 hover:underline">
            Impostazioni › Stagioni
          </Link>{" "}
          per poter programmare le tappe.
        </Callout>
      </>
    );
  }

  return (
    <Overview
      key={season.id}
      season={season}
      noneActive={!seasons.some((s) => s.is_active)}
      // Only the active season is the one being played tonight.
      liveName={live?.open && season.is_active ? live.name : null}
    />
  );
}

type Modal = "edit-season" | "activate" | "delete-season" | "new-event";

function Overview({ season, noneActive, liveName }: { season: Season; noneActive: boolean; liveName: string | null }) {
  const { seasons, setSeasons, setEvents, call } = useAdmin();
  const { events, imported, toImport } = useSeasonEvents(season.id);
  const { sync, syncing, error: syncError } = useMeleeSync();
  const [modal, setModal] = useState<Modal | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AdminError | null>(null);

  // Tonight's tappa stays the next one, and in its own list, past midnight.
  const today = events.filter(isToday);
  const upcoming = events.filter((event) => !isToday(event) && !isPast(event));
  const next = today[0] ?? upcoming[0];
  const played = events.filter((event) => !isToday(event) && isPast(event)).reverse();

  function open(m: Modal) {
    setModal(m);
    setError(null);
  }

  function close() {
    if (!pending) setModal(null);
  }

  async function activate() {
    setPending(true);
    const res = await call(`/api/admin/seasons?id=${season.id}&active=true`, { method: "PUT" });
    setPending(false);
    setModal(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSeasons((prev) => prev.map((s) => ({ ...s, is_active: s.id === season.id })));
    notify(`“${season.name}” è ora la stagione attiva: il sito pubblico mostra la sua classifica e le sue tappe.`);
  }

  async function deleteSeason() {
    setPending(true);
    const res = await call(`/api/admin/seasons?id=${season.id}`, { method: "DELETE" });
    setPending(false);
    setModal(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const id = season.id;
    // The sidebar falls back to the active season by itself.
    setSeasons((prev) => prev.filter((s) => s.id !== id));
    setEvents((prev) => prev.filter((event) => event.season_id !== id));
    notify(`Stagione “${season.name}” eliminata.`);
  }

  const shown = error ?? syncError;

  return (
    <>
      <PageHeader
        title={season.name}
        badge={seasonStatus(season)}
        meta={
          <span className="tn">
            {seasonPeriod(season)} · {countedLabel(season)}
          </span>
        }
        actions={
          <>
            <button type="button" className={BUTTON} onClick={() => open("edit-season")}>
              Modifica
            </button>
            <MoreMenu
              actions={[
                ...(season.is_active ? [] : [{ label: "Rendi attiva sul sito", onSelect: () => open("activate") }]),
                { label: "Elimina stagione", danger: true, onSelect: () => open("delete-season") },
              ]}
            />
          </>
        }
      />

      {noneActive && (
        <Callout title="Nessuna stagione attiva">
          Il sito pubblico non ha una classifica da mostrare finché non scegli «Rendi attiva» su una stagione.
        </Callout>
      )}

      {shown && (
        <div className="mb-6">
          <ErrorPanel error={shown} />
        </div>
      )}

      {liveName && (
        <Link
          href="/admin/declarations"
          className="card mb-6 flex items-center gap-4 border-accent/40! px-5 py-4 transition-colors hover:bg-[#1b212b]!"
        >
          <span className="live-dot h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-semibold">Raccolta dei mazzi aperta</span>
            <span className="block truncate text-[14px] text-ink/55">{tappaTitle(liveName)}</span>
          </span>
          <span className="shrink-0 text-[15px] font-semibold text-accent">Torneo in corso →</span>
        </Link>
      )}

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <Tile
          label="Tappe importate"
          foot={<Progress done={imported} total={events.length} counted={season.counted_events} className="w-full" />}
        >
          <p className={BIG}>
            {imported}
            <span className="text-ink/35">/{events.length}</span>
          </p>
        </Tile>
        <Tile
          label="Da importare"
          foot={
            toImport > 0 ? (
              <button type="button" className={`${BUTTON_PRIMARY} w-full`} onClick={() => void sync()} disabled={syncing}>
                {syncing ? "Importo da melee.gg…" : "Importa da melee.gg"}
              </button>
            ) : (
              <p className="text-[14px] text-ink/50">Tutte le tappe giocate sono importate.</p>
            )
          }
        >
          <p className={`${BIG} ${toImport > 0 ? "text-accent" : ""}`}>{toImport}</p>
        </Tile>
        {season.ended_at && !next ? (
          <Tile label="Stagione conclusa">
            <p className="tn font-[family-name:var(--font-archivo)] text-[22px] leading-tight font-bold">
              {displayDate(season.ended_at)}
            </p>
            <p className="mt-1 text-[15px] text-ink/60">
              {season.is_active ? "È ancora la stagione mostrata dal sito." : "Resta consultabile, il sito mostra un'altra stagione."}
            </p>
          </Tile>
        ) : (
          <Tile
            label="Prossima tappa"
            foot={
              !next && (
                <button type="button" className={`${BUTTON} w-full`} onClick={() => open("new-event")}>
                  Nuova tappa
                </button>
              )
            }
          >
            {next ? (
              <Link href={`/admin/events/${next.id}`} className="group block">
                <p className="tn font-[family-name:var(--font-archivo)] text-[22px] leading-tight font-bold group-hover:text-accent">
                  {displayDate(next.played_at)}
                </p>
                <p className="mt-1 truncate text-[15px] text-ink/70">
                  {tappaTitle(next.name)} · ore {displayTime(next.played_at)}
                </p>
                {!next.melee_tournament_id && (
                  <p className="mt-2 text-[13px] font-semibold text-[#ff5a66]">
                    Manca l&apos;ID del torneo Melee: senza non si può mettere in corso.
                  </p>
                )}
              </Link>
            ) : (
              <p className="text-[15px] text-ink/50">Nessuna tappa in programma.</p>
            )}
          </Tile>
        )}
      </div>

      {events.length === 0 ? (
        <section className="card">
          <EmptyState>
            Nessuna tappa in questa stagione.{" "}
            <button type="button" className="font-semibold text-accent hover:underline" onClick={() => open("new-event")}>
              Programmane una
            </button>
            : comparirà sul sito tra i prossimi eventi.
          </EmptyState>
        </section>
      ) : (
        <div className="space-y-10">
          {today.length > 0 && <EventList title="Oggi" events={today} empty="" complete />}
          <div className="grid items-start gap-x-6 gap-y-10 xl:grid-cols-2">
            <EventList title="In programma" events={upcoming.slice(0, 4)} empty="Nessuna tappa in programma." />
            <EventList title="Ultime giocate" events={played.slice(0, 4)} empty="Nessuna tappa giocata finora." />
          </div>
        </div>
      )}

      {modal === "edit-season" && (
        <SeasonDialog
          season={season}
          onClose={close}
          onSaved={(saved) => {
            setSeasons((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
            setModal(null);
            notify(`Stagione “${saved.name}” aggiornata.`);
          }}
        />
      )}

      {modal === "activate" && (
        <ConfirmDialog
          title={`Rendere attiva “${season.name}”?`}
          confirmLabel="Rendi attiva"
          busy={pending}
          onCancel={close}
          onConfirm={() => void activate()}
        >
          {seasons.some((s) => s.is_active)
            ? "Il sito pubblico passa subito a questa stagione: home, classifica e pagine dei giocatori mostreranno i suoi dati."
            : "Il sito pubblico tornerà a mostrare una classifica, quella di questa stagione."}
        </ConfirmDialog>
      )}

      <ConfirmResetDialog
        open={modal === "delete-season"}
        word="ELIMINA"
        title={`Elimina “${season.name}”`}
        confirmLabel="Elimina stagione"
        pending={pending}
        onCancel={close}
        onConfirm={() => void deleteSeason()}
      >
        {events.length > 0 ? (
          <p>
            Verranno eliminate anche le sue <strong>{events.length} tappe</strong> con tutti i match e le classifiche. I
            giocatori restano.
          </p>
        ) : (
          <p>La stagione non ha tappe.</p>
        )}
        {season.is_active && (
          <p>È la stagione attiva: il sito pubblico resterà senza classifica finché non ne scegli un&apos;altra.</p>
        )}
        <p>L&apos;operazione non è reversibile.</p>
      </ConfirmResetDialog>

      {modal === "new-event" && (
        <EventDialog
          event={null}
          seasonId={season.id}
          onClose={close}
          onSaved={(saved) => {
            setEvents((prev) => [...prev, saved]);
            setModal(null);
            notify(
              <>
                Tappa “{tappaTitle(saved.name)}” creata.{" "}
                <Link href={`/admin/events/${saved.id}`} className="text-accent underline-offset-2 hover:underline">
                  Apri →
                </Link>
              </>,
            );
          }}
        />
      )}
    </>
  );
}

/** A few tappe under a title; complete when the list has them all, so no link to the rest. */
function EventList({
  title,
  events,
  empty,
  complete = false,
}: {
  title: string;
  events: ReturnType<typeof useSeasonEvents>["events"];
  empty: string;
  complete?: boolean;
}) {
  return (
    <section>
      <SectionHeader
        title={title}
        action={
          !complete && (
            <Link href="/admin/events" className="text-[14px] font-medium text-ink/55 hover:text-ink">
              Tutte le tappe →
            </Link>
          )
        }
      />
      <div className="card">
        {events.length === 0 ? (
          <EmptyState>{empty}</EmptyState>
        ) : (
          <ul>
            {events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
