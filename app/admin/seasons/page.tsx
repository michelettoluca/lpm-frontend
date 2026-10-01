"use client";

import Link from "next/link";
import { useState } from "react";
import { useAdmin } from "../AdminShell";
import { DangerZone } from "../DangerZone";
import { SeasonDialog } from "../SeasonDialog";
import { BUTTON_PRIMARY, Callout, EmptyState, notify, PageHeader, Pagination, usePage } from "../dashboardUi";
import { countedLabel, seasonPeriod, seasonStatus } from "../seasonDisplay";

/**
 * Tappe with results out of the season's total. The tick marks the point where
 * every player could have a full set of counted results; it only shows when
 * some tappe will be dropped.
 */
function Progress({ done, total, counted }: { done: number; total: number; counted: number | null }) {
  const tick = counted != null && counted < total ? (counted / total) * 100 : null;
  return (
    <div className="relative h-1.5 w-24" aria-hidden>
      <div className="h-full overflow-hidden rounded-full bg-ink/8">
        <div className="bg-accent h-full rounded-full" style={{ width: total ? `${(done / total) * 100}%` : 0 }} />
      </div>
      {tick !== null && (
        <div
          className="absolute -top-[3px] h-3 w-0.5 -translate-x-1/2 rounded-full bg-ink"
          style={{ left: `${tick}%` }}
          title={`Tappe valide: ${counted}`}
        />
      )}
    </div>
  );
}

const ROW = "grid items-center gap-x-6 gap-y-2 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_180px_110px_16px]";

export default function SeasonsPage() {
  const { seasons, events, setSeasons } = useAdmin();
  const [creating, setCreating] = useState(false);

  const hasActive = seasons.some((season) => season.is_active);
  const { rows, pager } = usePage(seasons);

  return (
    <>
      <PageHeader
        title="Stagioni"
        meta="Apri una stagione per gestirne le tappe e importare i risultati."
        actions={
          <button type="button" className={BUTTON_PRIMARY} onClick={() => setCreating(true)}>
            Nuova stagione
          </button>
        }
      />


      {seasons.length > 0 && !hasActive && (
        <Callout title="Nessuna stagione attiva">
          Il sito pubblico non ha una classifica da mostrare finché non ne apri una e scegli «Rendi attiva».
        </Callout>
      )}

      <div className="card">
        <div className={`${ROW} hidden border-b border-ink/10 py-3 sm:grid`}>
          <span className="lbl">Stagione</span>
          <span className="lbl">Tappe importate</span>
          <span className="lbl">Stato</span>
          <span />
        </div>
        {seasons.length === 0 ? (
          <EmptyState>Nessuna stagione. Creane una per poter programmare le tappe.</EmptyState>
        ) : (
          <ul>
            {rows.map((season) => {
              const own = events.filter((event) => event.season_id === season.id);
              const done = own.filter((event) => event.has_results).length;
              return (
                <li key={season.id} className="border-b border-ink/8 last:border-b-0">
                  <Link href={`/admin/seasons/${season.id}`} className={`row-link ${ROW}`}>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{season.name}</p>
                      <p className="tn mt-0.5 text-[13px] text-ink/50">
                        {seasonPeriod(season)} · {countedLabel(season).toLowerCase()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress done={done} total={own.length} counted={season.counted_events} />
                      <span className="tn text-[13px] text-ink/60">
                        {done}/{own.length}
                      </span>
                    </div>
                    <div>{seasonStatus(season)}</div>
                    <span className="hidden text-lg text-ink/30 sm:block" aria-hidden>
                      ›
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <Pagination {...pager} />
      </div>

      <DangerZone />

      {creating && (
        <SeasonDialog
          season={null}
          onClose={() => setCreating(false)}
          onSaved={(season) => {
            setSeasons((prev) => [season, ...prev]);
            setCreating(false);
            notify(
              <>
                Stagione “{season.name}” creata.{" "}
                <Link href={`/admin/seasons/${season.id}`} className="text-accent underline-offset-2 hover:underline">
                  Aprila per aggiungere le tappe →
                </Link>
              </>,
            );
          }}
        />
      )}
    </>
  );
}
