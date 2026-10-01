import type { ManagedEvent } from "@/app/lib/adminTypes";
import { Badge, dayAndMonth } from "./dashboardUi";

export function isPast(event: ManagedEvent) {
  return new Date(event.played_at).getTime() < Date.now();
}

export function EventStatus({ event }: { event: ManagedEvent }) {
  if (event.has_results) return <Badge tone="ink">Importata</Badge>;
  if (isPast(event)) return <Badge tone="outline">Da importare</Badge>;
  return <Badge>In programma</Badge>;
}

export function DateTile({ iso }: { iso: string }) {
  const { day, month } = dayAndMonth(iso);
  return (
    <div className="grid h-9 w-9 place-items-center rounded-md border border-ink/10 bg-surface text-center leading-none">
      <div>
        <div className="tn text-[13px] font-semibold">{day}</div>
        <div className="mt-px text-[9px] font-medium uppercase text-ink/50">{month}</div>
      </div>
    </div>
  );
}
