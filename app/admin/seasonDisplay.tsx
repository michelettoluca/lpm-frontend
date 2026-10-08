import type { Season } from "@/app/lib/adminTypes";
import { Badge, displayDate } from "./dashboardUi";

export function seasonStatus(season: Season) {
  if (season.is_active) return <Badge tone="success">Attiva</Badge>;
  if (season.ended_at) return <Badge>Conclusa</Badge>;
  return <Badge>In corso</Badge>;
}

export function seasonPeriod(season: Season) {
  return `${displayDate(season.started_at)} → ${season.ended_at ? displayDate(season.ended_at) : "in corso"}`;
}

export function countedLabel(season: Season) {
  return season.counted_events == null ? "Contano tutte le tappe" : `Contano le migliori ${season.counted_events}`;
}

/**
 * Tappe with results out of the season's total. The tick marks the point where
 * every player could have a full set of counted results; it only shows when
 * some tappe will be dropped.
 */
export function Progress({
  done,
  total,
  counted,
  className = "w-24",
}: {
  done: number;
  total: number;
  counted: number | null;
  className?: string;
}) {
  const tick = counted != null && counted < total ? (counted / total) * 100 : null;
  return (
    <div className={`relative h-2 ${className}`} aria-hidden>
      <div className="h-full overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full bg-accent" style={{ width: total ? `${(done / total) * 100}%` : 0 }} />
      </div>
      {tick !== null && (
        <div
          className="absolute -top-[3px] h-3.5 w-0.5 -translate-x-1/2 rounded-full bg-ink"
          style={{ left: `${tick}%` }}
          title={`Tappe valide: ${counted}`}
        />
      )}
    </div>
  );
}
