"use client";

import Link from "next/link";
import { useState } from "react";
import type { AdminError, ManagedEvent, MeleeSyncResult } from "@/app/lib/adminTypes";
import { tappaSubtitle, tappaTitle } from "@/app/lib/format";
import { useAdmin } from "./AdminShell";
import { Badge, dayAndMonth, displayTime, notify } from "./dashboardUi";

export function isPast(event: ManagedEvent) {
  return new Date(event.played_at).getTime() < Date.now();
}

export function EventStatus({ event }: { event: ManagedEvent }) {
  if (event.has_results) return <Badge tone="success">Importata</Badge>;
  if (isPast(event)) return <Badge tone="attention">Da importare</Badge>;
  return <Badge>In programma</Badge>;
}

export function DateTile({ iso }: { iso: string }) {
  const { day, month } = dayAndMonth(iso);
  return (
    <div className="grid h-12 w-12 place-items-center rounded-xl bg-ink/[0.06] text-center leading-none">
      <div>
        <div className="tn font-[family-name:var(--font-archivo)] text-[17px] font-bold">{day}</div>
        <div className="mt-0.5 text-[11px] font-medium uppercase text-ink/55">{month}</div>
      </div>
    </div>
  );
}

// Date · event · status · chevron, with fixed side columns so rows align.
const ROW =
  "grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-x-4 px-4 py-3.5 sm:px-5 md:grid-cols-[48px_minmax(0,1fr)_128px_16px]";

/** A tappa in a list, opening its page. */
export function EventRow({ event }: { event: ManagedEvent }) {
  return (
    <li className="border-b border-ink/8 last:border-b-0">
      <Link href={`/admin/events/${event.id}`} className={`row-link ${ROW}`}>
        <DateTile iso={event.played_at} />
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold">{tappaTitle(event.name)}</p>
          <p className="tn mt-0.5 truncate text-[14px] text-ink/55">
            {displayTime(event.played_at)} · {event.format || "formato non indicato"} · {tappaSubtitle(event.name)}
          </p>
        </div>
        <div>
          <EventStatus event={event} />
        </div>
        <span className="hidden text-xl text-ink/30 md:block" aria-hidden>
          ›
        </span>
      </Link>
    </li>
  );
}

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
        <ul className="mt-1.5 space-y-1 text-[14px] font-normal text-ink/65">
          {skipped.map((s) => (
            <li key={s.event_id}>
              <Link href={`/admin/events/${s.event_id}`} className="font-medium text-ink underline-offset-2 hover:underline">
                {tappaTitle(s.event_name)}
              </Link>
              : {SKIP_REASONS[s.reason]}
              {s.error && <span className="block whitespace-pre-wrap text-[13px] text-ink/50">{s.error}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Import every past tappa from the Melee tournament held on its day. */
export function useMeleeSync() {
  const { call, refresh } = useAdmin();
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<AdminError | null>(null);

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

  return { sync, syncing, error };
}

/** The season's tappe in date order, with how many are in and how many are due. */
export function useSeasonEvents(seasonId: number | undefined) {
  const { events } = useAdmin();
  const own = events
    .filter((event) => event.season_id === seasonId)
    .sort((a, b) => a.played_at.localeCompare(b.played_at));
  return {
    events: own,
    imported: own.filter((event) => event.has_results).length,
    toImport: own.filter((event) => !event.has_results && isPast(event)).length,
  };
}
