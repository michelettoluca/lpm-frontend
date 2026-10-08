"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAdmin } from "../AdminShell";
import { DangerZone } from "../DangerZone";
import { SeasonDialog } from "../SeasonDialog";
import { BUTTON_PRIMARY, Callout, EmptyState, notify, PageHeader, Pagination, usePage } from "../dashboardUi";
import { countedLabel, Progress, seasonPeriod, seasonStatus } from "../seasonDisplay";

const ROW = "grid items-center gap-x-6 gap-y-2 px-4 py-4 sm:px-5 sm:grid-cols-[minmax(0,1fr)_180px_110px_16px]";

export default function SeasonsPage() {
  const { seasons, events, setSeasons, selectSeason } = useAdmin();
  const router = useRouter();

  function openSeason(id: number) {
    selectSeason(id);
    router.push("/admin");
  }
  const [creating, setCreating] = useState(false);

  const hasActive = seasons.some((season) => season.is_active);
  const { rows, pager } = usePage(seasons);

  return (
    <>
      <PageHeader
        title="Stagioni"
        meta="Scegline una per vederla nella panoramica. Quella attiva è la stagione che mostra il sito pubblico."
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
                  <button type="button" onClick={() => openSeason(season.id)} className={`row-link w-full text-left ${ROW}`}>
                    <div className="min-w-0">
                      <p className="truncate text-[16px] font-semibold">{season.name}</p>
                      <p className="tn mt-0.5 text-[14px] text-ink/55">
                        {seasonPeriod(season)} · {countedLabel(season).toLowerCase()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress done={done} total={own.length} counted={season.counted_events} />
                      <span className="tn text-[15px] text-ink/60">
                        {done}/{own.length}
                      </span>
                    </div>
                    <div>{seasonStatus(season)}</div>
                    <span className="hidden text-lg text-ink/30 sm:block" aria-hidden>
                      ›
                    </span>
                  </button>
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
                <button type="button" onClick={() => openSeason(season.id)} className="text-accent underline-offset-2 hover:underline">
                  Aprila per aggiungere le tappe →
                </button>
              </>,
            );
          }}
        />
      )}
    </>
  );
}
