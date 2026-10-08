"use client";

import Link from "next/link";
import { useState } from "react";
import type { ManagedEvent } from "@/app/lib/adminTypes";
import { tappaTitle } from "@/app/lib/format";
import { useAdmin } from "../AdminShell";
import { ErrorPanel } from "../ErrorPanel";
import { EventDialog } from "../EventDialog";
import { BUTTON, BUTTON_PRIMARY, EmptyState, notify, PageHeader, SectionHeader } from "../dashboardUi";
import { EventRow, isPast, isToday, useMeleeSync, useSeasonEvents } from "../eventDisplay";

/**
 * Every tappa of the season picked in the sidebar: tonight's first, kept
 * there past midnight, then the ones to come, the soonest on top, then the
 * ones played, the latest on top.
 * A season holds a dozen or two, so no paging.
 */
export default function EventsPage() {
  const { season, setEvents } = useAdmin();
  const { events, imported, toImport } = useSeasonEvents(season?.id);
  const { sync, syncing, error } = useMeleeSync();
  const [creating, setCreating] = useState(false);

  if (!season) {
    return (
      <PageHeader
        title="Tappe"
        meta={
          <>
            Crea prima una stagione da{" "}
            <Link href="/admin/seasons" className="font-semibold text-accent hover:underline">
              Impostazioni › Stagioni
            </Link>
            .
          </>
        }
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Tappe"
        meta={
          <span className="tn">
            {season.name}
            {events.length > 0 &&
              ` · ${events.length} tappe · ${imported} importate${toImport > 0 ? ` · ${toImport} da importare` : ""}`}
          </span>
        }
        actions={
          <>
            {toImport > 0 && (
              <button type="button" className={BUTTON} onClick={() => void sync()} disabled={syncing}>
                {syncing ? "Importo da melee.gg…" : "Importa da melee.gg"}
              </button>
            )}
            <button type="button" className={BUTTON_PRIMARY} onClick={() => setCreating(true)}>
              Nuova tappa
            </button>
          </>
        }
      />

      {error && (
        <div className="mb-6">
          <ErrorPanel error={error} />
        </div>
      )}

      {events.length === 0 ? (
        <div className="card">
          <EmptyState>Nessuna tappa in questa stagione. Programmane una: comparirà sul sito tra i prossimi eventi.</EmptyState>
        </div>
      ) : (
        <div className="space-y-10">
          <Group title="Oggi" events={events.filter(isToday)} />
          <Group title="In programma" events={events.filter((e) => !isToday(e) && !isPast(e))} />
          <Group title="Giocate" events={events.filter((e) => !isToday(e) && isPast(e)).reverse()} />
        </div>
      )}

      {creating && (
        <EventDialog
          event={null}
          seasonId={season.id}
          onClose={() => setCreating(false)}
          onSaved={(saved) => {
            setEvents((prev) => [...prev, saved]);
            setCreating(false);
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

function Group({ title, events }: { title: string; events: ManagedEvent[] }) {
  if (events.length === 0) return null;
  return (
    <section>
      <SectionHeader title={title} aside={events.length} />
      <div className="card">
        <ul>
          {events.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </ul>
      </div>
    </section>
  );
}
