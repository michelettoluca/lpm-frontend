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
import {
  BUTTON,
  ConfirmDialog,
  displayDate,
  displayTime,
  MoreMenu,
  notify,
  PageHeader,
} from "../../dashboardUi";
import { EventStatus } from "../../eventDisplay";
import { EventDecks } from "./EventDecks";
import { MeleeTournament } from "./MeleeTournament";

type Modal = "edit" | "delete" | "reset";

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { seasons, events, setEvents, call, selectSeason } = useAdmin();
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
    notify("Risultati rimossi. La tappa tiene il suo torneo Melee: importala di nuovo quando vuoi.");
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
            {displayDate(event.played_at)} · ore {displayTime(event.played_at)} · {event.format || "formato non indicato"}
            <span className="text-ink/35"> · id {event.id}</span>
          </span>
        }
        actions={
          <>
            {event.has_results && (
              <Link href={`/tappe/${event.id}`} target="_blank" rel="noopener" className={BUTTON}>
                Sul sito ↗
              </Link>
            )}
            <button type="button" className={BUTTON} onClick={() => open("edit")}>
              Modifica
            </button>
            <MoreMenu
              actions={[
                ...(event.has_results
                  ? [{ label: "Reimposta risultati", danger: true, onSelect: () => open("reset") }]
                  : []),
                { label: "Elimina tappa", danger: true, onSelect: () => open("delete") },
              ]}
            />
          </>
        }
      />

      {error && (
        <div className="mb-6">
          <ErrorPanel error={error} />
        </div>
      )}

      {event.has_results ? (
        <EventDecks eventId={event.id} eventName={event.name} />
      ) : (
        <MeleeTournament key={event.melee_tournament_id ?? 0} event={event} />
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
          senza di essa. La tappa resta con nome, data, stagione e torneo Melee: potrai importarla di nuovo subito dopo.
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
