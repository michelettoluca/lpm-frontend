"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminError, MeleeSyncResult } from "@/app/lib/adminTypes";
import { tappaSubtitle, tappaTitle } from "@/app/lib/format";
import { useAdmin } from "../../AdminShell";
import { ConfirmResetDialog } from "../../ConfirmResetDialog";
import { ErrorPanel } from "../../ErrorPanel";
import { EventDialog } from "../../EventDialog";
import { SeasonDialog } from "../../SeasonDialog";
import {
  BUTTON,
  BUTTON_DANGER,
  BUTTON_PRIMARY,
  ConfirmDialog,
  displayTime,
  EmptyState,
  notify,
  PageHeader,
  SectionHeader,
} from "../../dashboardUi";
import { DateTile, EventStatus, isPast } from "../../eventDisplay";
import { countedLabel, seasonPeriod, seasonStatus } from "../../seasonDisplay";

const SKIP_REASONS: Record<MeleeSyncResult["skipped"][number]["reason"], string> = {
  no_tournament: "nessun torneo su melee.gg quel giorno",
  ambiguous: "più tornei o più tappe nello stesso giorno: scegli il torneo dalla pagina della tappa",
  not_ended: "il torneo su melee.gg non è ancora concluso",
  too_old: "più vecchia di 90 giorni: importala dalla pagina della tappa",
  failed: "import non riuscito",
};

/** What a sync did, for the toast. */
function SyncSummary({ result }: { result: MeleeSyncResult }) {
  const { imported, skipped } = result;
  return (
    <div className="py-1">
      <p>
        {imported.length === 0
          ? "Nessuna tappa importata da melee.gg."
          : `Importate da melee.gg: ${imported.map((i) => tappaTitle(i.event_name)).join(", ")}.`}
      </p>
      {skipped.length > 0 && (
        <ul className="mt-1.5 space-y-1 text-[13px] font-normal text-ink/65">
          {skipped.map((s) => (
            <li key={s.event_id}>
              <Link href={`/admin/events/${s.event_id}`} className="font-bold text-ink underline-offset-2 hover:underline">
                {tappaTitle(s.event_name)}
              </Link>
              : {SKIP_REASONS[s.reason]}
              {s.error && <span className="block whitespace-pre-wrap text-[12px] text-ink/50">{s.error}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Modal = "edit-season" | "activate" | "delete-season" | "new-event";

// Date · event · status · chevron, with fixed side columns so rows align.
const ROW =
  "grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-x-4 px-5 py-3.5 md:grid-cols-[52px_minmax(0,1fr)_128px_16px]";

export default function SeasonDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { seasons, events, setSeasons, setEvents, call, refresh } = useAdmin();
  const [syncing, setSyncing] = useState(false);
  const [modal, setModal] = useState<Modal | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AdminError | null>(null);

  const season = seasons.find((s) => String(s.id) === params.id);
  const back = (
    <Link href="/admin/seasons" className="text-[13px] font-bold text-ink/50 hover:text-ink">
      ← Stagioni
    </Link>
  );

  if (!season) {
    return <PageHeader back={back} title="Stagione non trovata" meta="Potrebbe essere stata eliminata." />;
  }

  const seasonEvents = events
    .filter((event) => event.season_id === season.id)
    .sort((a, b) => a.played_at.localeCompare(b.played_at));
  const withResults = seasonEvents.filter((event) => event.has_results).length;
  const toImport = seasonEvents.filter((event) => !event.has_results && isPast(event)).length;

  function open(next: Modal) {
    setModal(next);
    setError(null);
  }

  function close() {
    if (!pending) setModal(null);
  }

  // Import every past event from the Melee tournament held on its day.
  async function sync() {
    setSyncing(true);
    setError(null);
    const res = await call<MeleeSyncResult>("/api/admin/import/melee-sync", { method: "POST" });
    if (!res.ok) {
      setSyncing(false);
      setError(res.error);
      return;
    }
    if (res.data.imported.length > 0) await refresh();
    setSyncing(false);
    notify(<SyncSummary result={res.data} />, { long: res.data.skipped.length > 0 });
  }

  async function activate() {
    setPending(true);
    const res = await call(`/api/admin/seasons?id=${season!.id}&active=true`, { method: "PUT" });
    setPending(false);
    setModal(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSeasons((prev) => prev.map((s) => ({ ...s, is_active: s.id === season!.id })));
    notify(`“${season!.name}” è ora la stagione attiva: il sito pubblico mostra la sua classifica e le sue tappe.`);
  }

  async function deleteSeason() {
    setPending(true);
    const res = await call(`/api/admin/seasons?id=${season!.id}`, { method: "DELETE" });
    setPending(false);
    setModal(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const id = season!.id;
    setSeasons((prev) => prev.filter((s) => s.id !== id));
    setEvents((prev) => prev.filter((event) => event.season_id !== id));
    router.replace("/admin/seasons");
  }

  return (
    <>
      <PageHeader
        back={back}
        title={season.name}
        badge={seasonStatus(season)}
        meta={
          <span className="tn">
            {seasonPeriod(season)} · {countedLabel(season)}
          </span>
        }
        actions={
          <>
            {!season.is_active && (
              <button type="button" className={BUTTON} onClick={() => open("activate")}>
                Rendi attiva
              </button>
            )}
            <button type="button" className={BUTTON} onClick={() => open("edit-season")}>
              Modifica
            </button>
            <button type="button" className={BUTTON_DANGER} onClick={() => open("delete-season")}>
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

      <SectionHeader
        title="Tappe"
        aside={
          seasonEvents.length > 0 &&
          `${seasonEvents.length} · ${withResults} importate${toImport > 0 ? ` · ${toImport} da importare` : ""}`
        }
        action={
          <div className="flex flex-wrap justify-end gap-2">
            {toImport > 0 && (
              <button type="button" className={BUTTON} onClick={() => void sync()} disabled={syncing}>
                {syncing ? "Importo da melee.gg…" : "Importa da melee.gg"}
              </button>
            )}
            <button type="button" className={BUTTON_PRIMARY} onClick={() => open("new-event")}>
              Nuova tappa
            </button>
          </div>
        }
      />

      <div className="card">
        {seasonEvents.length === 0 ? (
          <EmptyState>Nessuna tappa in questa stagione. Programmane una: comparirà sul sito tra i prossimi eventi.</EmptyState>
        ) : (
          <ul>
            {seasonEvents.map((event) => (
              <li key={event.id} className="border-b border-ink/8 last:border-b-0">
                <Link href={`/admin/events/${event.id}`} className={`row-link ${ROW}`}>
                  <DateTile iso={event.played_at} />
                  <div className="min-w-0">
                    <p className="truncate font-bold">{tappaTitle(event.name)}</p>
                    <p className="tn mt-0.5 truncate text-[13px] text-ink/50">
                      {displayTime(event.played_at)} · {event.format || "formato non indicato"} ·{" "}
                      {tappaSubtitle(event.name)}
                    </p>
                  </div>
                  <div>
                    <EventStatus event={event} />
                  </div>
                  <span className="hidden text-lg text-ink/30 md:block" aria-hidden>
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

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
        {seasonEvents.length > 0 ? (
          <p>
            Verranno eliminate anche le sue <strong>{seasonEvents.length} tappe</strong> con tutti i match e le
            classifiche. I giocatori restano.
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
