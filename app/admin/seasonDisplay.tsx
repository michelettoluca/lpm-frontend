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
