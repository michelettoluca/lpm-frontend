"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
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

type Modal = "edit" | "delete" | "reset";

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink/8 py-2.5 last:border-b-0">
      <dt className="lbl shrink-0">{label}</dt>
      <dd className="tn min-w-0 text-right text-sm break-words">{children}</dd>
    </div>
  );
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { seasons, events, setEvents, call } = useAdmin();
  const [modal, setModal] = useState<Modal | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AdminError | null>(null);

  const event = events.find((e) => String(e.id) === params.id);
  const season = event && seasons.find((s) => s.id === event.season_id);

  if (!event) {
    return (
      <PageHeader
        back={
          <Link href="/admin/seasons" className="text-[13px] font-bold text-ink/50 hover:text-ink">
            ← Stagioni
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
    const { id, season_id } = event!;
    setEvents((prev) => prev.filter((e) => e.id !== id));
    router.replace(`/admin/seasons/${season_id}`);
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
          <Link href={`/admin/seasons/${event.season_id}`} className="text-[13px] font-bold text-ink/50 hover:text-ink">
            ← {season?.name ?? "Stagione"}
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

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {event.has_results ? (
          <section className="card p-5 sm:p-6">
            <h2 className="text-lg font-extrabold tracking-[-0.01em]">Risultati importati</h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink/55">
              Classifica, turni e match della tappa sono pubblicati sul sito e contano per la classifica di stagione.
              Se l&apos;import è sbagliato, reimposta i risultati e carica di nuovo i file: la tappa resta.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={`/events/${event.id}`} target="_blank" rel="noopener" className={BUTTON_PRIMARY}>
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
              <p className="mb-3 text-[13px] text-ink/50">
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
                      href={`/events/${result.event_id}`}
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
