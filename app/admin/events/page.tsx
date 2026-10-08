"use client";

import Link from "next/link";
import { useState } from "react";
import { tappaTitle } from "@/app/lib/format";
import { useAdmin } from "../AdminShell";
import { ErrorPanel } from "../ErrorPanel";
import { EventDialog } from "../EventDialog";
import { BUTTON, BUTTON_PRIMARY, EmptyState, notify, PageHeader, Pagination, usePage } from "../dashboardUi";
import { EventRow, useMeleeSync, useSeasonEvents } from "../eventDisplay";

/** Every tappa of the season picked in the sidebar, in date order. */
export default function EventsPage() {
  const { season, setEvents } = useAdmin();
  const { events, imported, toImport } = useSeasonEvents(season?.id);
  const { sync, syncing, error } = useMeleeSync();
  const [creating, setCreating] = useState(false);
  const { rows, pager } = usePage(events);

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

      <div className="card">
        {events.length === 0 ? (
          <EmptyState>Nessuna tappa in questa stagione. Programmane una: comparirà sul sito tra i prossimi eventi.</EmptyState>
        ) : (
          <ul>
            {rows.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </ul>
        )}
        <Pagination {...pager} />
      </div>

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
