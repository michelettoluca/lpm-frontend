"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { AdminError, ManagedEvent } from "@/app/lib/adminTypes";
import { tappaTitle } from "@/app/lib/format";
import { useAdmin } from "../../AdminShell";
import { ConfirmResetDialog } from "../../ConfirmResetDialog";
import { ErrorPanel } from "../../ErrorPanel";
import { EventDialog } from "../../EventDialog";
import { ImportPanel } from "../../ImportPanel";
import {
  BUTTON,
  BUTTON_DANGER,
  BUTTON_PRIMARY,
  ConfirmDialog,
  displayDate,
  displayTime,
  notify,
  PageHeader,
} from "../../dashboardUi";
import { EventStatus, isPast } from "../../eventDisplay";
import { EventDecks } from "./EventDecks";

type Modal = "edit" | "delete" | "reset";

type Tab = "risultati" | "mazzi";

const TABS: { value: Tab; label: string }[] = [
  { value: "risultati", label: "Risultati" },
  { value: "mazzi", label: "Mazzi" },
];

/** The tab in the address, so a link or a reload lands on it. */
function tabFromUrl(): Tab {
  return new URLSearchParams(window.location.search).get("tab") === "mazzi" ? "mazzi" : "risultati";
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink/8 py-2.5 last:border-b-0">
      <dt className="lbl shrink-0">{label}</dt>
      <dd className="tn min-w-0 text-right text-[15px] break-words">{children}</dd>
    </div>
  );
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { seasons, events, setEvents, call, selectSeason } = useAdmin();
  // The dashboard only renders pages once signed in, in the browser.
  const [tab, setTab] = useState<Tab>(tabFromUrl);
  const [modal, setModal] = useState<Modal | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AdminError | null>(null);

  const event = events.find((e) => String(e.id) === params.id);
  const season = event && seasons.find((s) => s.id === event.season_id);
  const seasonId = event?.season_id;

  // A tappa of another season moves the sidebar to that season.
  useEffect(() => {
    if (seasonId) selectSeason(seasonId);
  }, [seasonId, selectSeason]);

  function showTab(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "risultati") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(window.history.state, "", url);
  }

  if (!event) {
    return (
      <PageHeader
        back={
          <Link href="/admin/events" className="text-[15px] font-medium text-ink/50 hover:text-ink">
            ← Tappe
          </Link>
        }
        title="Tappa non trovata"
        meta="Potrebbe essere stata eliminata."
      />
    );
  }

  function open(next: Modal) {
    setModal(next);
    setError(null);
  }

  function close() {
    if (!pending) setModal(null);
  }

  async function remove() {
    setPending(true);
    const res = await call(`/api/admin/events?id=${event!.id}`, { method: "DELETE" });
    setPending(false);
    setModal(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const { id } = event!;
    setEvents((prev) => prev.filter((e) => e.id !== id));
    router.replace("/admin/events");
  }

  async function resetResults() {
    setPending(true);
    const res = await call<ManagedEvent>(`/api/admin/events?id=${event!.id}&results=true`, { method: "DELETE" });
    setPending(false);
    setModal(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEvents((prev) => prev.map((e) => (e.id === res.data.id ? res.data : e)));
    notify("Risultati rimossi. Carica di nuovo i file per reimportare la tappa.");
  }

  return (
    <>
      <PageHeader
        back={
          <Link href="/admin/events" className="text-[15px] font-medium text-ink/50 hover:text-ink">
            ← Tappe · {season?.name ?? "Stagione"}
          </Link>
        }
        title={tappaTitle(event.name)}
        badge={<EventStatus event={event} />}
        meta={
          <span className="tn">
            {displayDate(event.played_at)} · ore {displayTime(event.played_at)}
          </span>
        }
        actions={
          <>
            <button type="button" className={BUTTON} onClick={() => open("edit")}>
              Modifica
            </button>
            <button type="button" className={BUTTON_DANGER} onClick={() => open("delete")}>
              Elimina
            </button>
          </>
        }
      />

      {error && (
        <div className="mb-6">
          <ErrorPanel error={error} />
        </div>
      )}

      <div role="tablist" aria-label="Sezioni della tappa" className="mb-6 flex gap-1 border-b border-ink/10">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => showTab(t.value)}
            className={`-mb-px h-11 border-b-2 px-3 text-[16px] transition-colors ${
              tab === t.value ? "border-accent font-semibold text-ink" : "border-transparent text-ink/55 hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "mazzi" ? (
        event.has_results ? (
          <EventDecks eventId={event.id} eventName={event.name} />
        ) : (
          <DecksBeforeImport />
        )
      ) : (
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {event.has_results ? (
          <section className="card p-5">
            <h2 className="text-[19px] font-semibold">Risultati importati</h2>
            <p className="mt-1 max-w-xl text-[15px] leading-relaxed text-ink/55">
              Classifica, turni e match della tappa sono pubblicati sul sito e contano per la classifica di stagione.
              Se l&apos;import è sbagliato, reimposta i risultati e carica di nuovo i file: la tappa resta.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={`/tappe/${event.id}`} target="_blank" rel="noopener" className={BUTTON_PRIMARY}>
                Vedi la tappa sul sito ↗
              </Link>
              <button type="button" className={BUTTON_DANGER} onClick={() => open("reset")}>
                Reimposta risultati
              </button>
            </div>
          </section>
        ) : (
          <div>
            {!isPast(event) && (
              <p className="mb-3 text-[15px] text-ink/50">
                La tappa è in programma: importa i risultati quando il torneo su melee.gg è concluso.
              </p>
            )}
            <ImportPanel
              event={event}
              onImported={(result) => {
                notify(
                  <>
                    Risultati importati (torneo melee <span className="tn">{result.melee_tournament_id}</span>).{" "}
                    <Link
                      href={`/tappe/${result.event_id}`}
                      target="_blank"
                      rel="noopener"
                      className="text-accent underline-offset-2 hover:underline"
                    >
                      Vai alla tappa ↗
                    </Link>
                  </>,
                );
              }}
            />
          </div>
        )}

        <section className="card px-5 py-3">
          <dl>
            <Detail label="Nome">{event.name}</Detail>
            <Detail label="Stagione">{season?.name ?? `id ${event.season_id}`}</Detail>
            <Detail label="Data">
              {displayDate(event.played_at)} · {displayTime(event.played_at)}
            </Detail>
            <Detail label="Formato">{event.format || "—"}</Detail>
            <Detail label="Id">{event.id}</Detail>
          </dl>
        </section>
      </div>
      )}

      {modal === "edit" && (
        <EventDialog
          event={event}
          seasonId={event.season_id}
          onClose={close}
          onSaved={(saved) => {
            setEvents((prev) => prev.map((e) => (e.id === saved.id ? saved : e)));
            setModal(null);
            notify(`Tappa “${tappaTitle(saved.name)}” aggiornata.`);
          }}
        />
      )}

      <ConfirmResetDialog
        open={modal === "reset"}
        word="REIMPOSTA"
        title={`Reimposta i risultati di “${tappaTitle(event.name)}”`}
        confirmLabel="Reimposta risultati"
        pending={pending}
        onCancel={close}
        onConfirm={() => void resetResults()}
      >
        <p>
          Verranno eliminati classifica, turni e match della tappa, e la classifica di stagione verrà ricalcolata
          senza di essa. La tappa resta con nome, data e stagione: potrai importare di nuovo i file subito dopo.
        </p>
        <p>I giocatori restano. L&apos;operazione non è reversibile.</p>
      </ConfirmResetDialog>

      {modal === "delete" && (
        <ConfirmDialog
          title={`Eliminare “${tappaTitle(event.name)}”?`}
          confirmLabel="Elimina tappa"
          busy={pending}
          onCancel={close}
          onConfirm={() => void remove()}
        >
          {event.has_results
            ? "La tappa ha risultati importati: verranno eliminati anche i suoi round, match e la classifica. I giocatori restano. L'operazione non è reversibile."
            : "La tappa non ha ancora risultati. L'operazione non è reversibile."}
        </ConfirmDialog>
      )}
    </>
  );
}

/**
 * Before the results are in, a tappa's decks are the ones collected during
 * the night, on the Torneo in corso page; the import copies them here.
 */
function DecksBeforeImport() {
  const { live } = useAdmin();
  return (
    <section className="card p-5">
      <h2 className="text-[19px] font-semibold">I mazzi arrivano con i risultati</h2>
      <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-ink/60">
        Durante la tappa i mazzi si raccolgono da <strong className="text-ink">Torneo in corso</strong>: inserisci
        l&apos;ID del torneo Melee, apri la raccolta ai giocatori e completa i mancanti ai tavoli. Quando importi i
        risultati, i mazzi vengono copiati qui e potrai correggerli giocatore per giocatore.
      </p>
      {live && (
        <p className="mt-4 flex items-center gap-2 text-[15px]">
          {live.open && <span className="live-dot h-2 w-2 rounded-full bg-accent" />}
          <span className="text-ink/60">{live.open ? "Raccolta aperta per" : "Ultimo torneo:"}</span>
          <span className="font-semibold">{tappaTitle(live.name)}</span>
        </p>
      )}
      <Link href="/admin/declarations" className={`${BUTTON_PRIMARY} mt-5`}>
        Vai a Torneo in corso
      </Link>
    </section>
  );
}
