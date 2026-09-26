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
    <div className="grid h-[52px] w-[52px] place-items-center rounded-xl bg-ink/5 text-center leading-none">
      <div>
        <div className="tn text-[19px] font-extrabold tracking-[-0.02em]">{day}</div>
        <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-ink/50">{month}</div>
      </div>
    </div>
  );
}
