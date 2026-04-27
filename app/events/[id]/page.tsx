import Link from "next/link";
import { notFound } from "next/navigation";

type EventInfo = {
  id: number;
  season_id: number;
  name: string;
  format: string;
  played_at: string;
};

type Standing = {
  event_id: number;
  player_id: number;
  player_name: string;
  rank: number;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  byes: number;
  mwp: number;
  gwp: number;
  omw: number;
  ogw: number;
};

type EventDetail = {
  event: EventInfo;
  standings: Standing[];
};

async function getEvent(id: string): Promise<EventDetail | null> {
  const res = await fetch(`https://api.legapaupermilano.it/events/${id}`, {
    next: { revalidate: 60 },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load event: ${res.status}`);
  return res.json();
}

function shortEventName(name: string): string {
  const match = name.match(/Tappa\s+\d+/i);
  return match ? match[0] : name;
}

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function EventDetailPage(
  props: PageProps<"/events/[id]">,
) {
  const { id } = await props.params;
  const data = await getEvent(id);
  if (!data) notFound();

  const { event, standings } = data;
  const podium = standings.slice(0, 3);
  const rest = standings.slice(3);

  return (
    <main className="mx-auto w-full max-w-[720px] px-5 pt-8 pb-20 sm:px-5 sm:pt-10 sm:pb-20">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[0.78rem] font-semibold text-ink-light transition-colors duration-150 hover:text-red-accent"
      >
        <span aria-hidden>←</span> Tutte le tappe
      </Link>

      <header className="mt-5 mb-8 animate-pop">
        <h1 className="mb-2 font-display text-[1.35rem] font-bold tracking-[-0.02em] text-ink sm:text-[1.7rem]">
          {shortEventName(event.name)}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.78rem] font-medium text-ink-light">
          <span>{formatEventDate(event.played_at)}</span>
          <span aria-hidden>·</span>
          <span>
            <strong className="font-bold text-ink">{standings.length}</strong>{" "}
            giocatori
          </span>
        </div>
        <div className="mt-3.5 h-[3px] w-8 rounded-sm bg-red-accent" />
      </header>

      {podium.length > 0 && (
        <section className="mb-8 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {podium.map((s, i) => {
            const rank = i + 1;
            const isFirst = rank === 1;
            return (
              <div
                key={s.player_id}
                className={`relative overflow-hidden rounded-2xl px-4 py-4 opacity-0 animate-pop ${
                  isFirst
                    ? "bg-red-accent text-white shadow-[0_8px_30px_rgba(239,68,68,0.2)]"
                    : "bg-card border-2 border-black/[0.06]"
                }`}
                style={{ animationDelay: `${0.1 + i * 0.1}s` }}
              >
                <span
                  aria-hidden
                  className={`pointer-events-none absolute -right-2 -top-2 select-none font-display text-[3.2rem] font-bold leading-none ${
                    isFirst ? "text-white/[0.15]" : "text-black/[0.04]"
                  }`}
                >
                  #{rank}
                </span>
                <div
                  className={`relative z-10 text-[0.62rem] font-semibold uppercase tracking-[0.1em] ${
                    isFirst ? "text-white/60" : "text-ink-light"
                  }`}
                >
                  {rank}° posto
                </div>
                <div
                  className={`relative z-10 mt-1 truncate font-semibold capitalize ${
                    isFirst ? "text-white" : "text-ink"
                  } text-[1rem]`}
                >
                  {s.player_name}
                </div>
                <div
                  className={`relative z-10 mt-1 font-display text-[1.5rem] font-bold leading-none tracking-[-0.02em] ${
                    isFirst ? "text-white" : "text-ink"
                  }`}
                >
                  {s.points}
                </div>
                <div
                  className={`relative z-10 mt-1 text-[0.7rem] ${
                    isFirst ? "text-white/70" : "text-ink-light"
                  }`}
                >
                  {s.wins}V · {s.losses}S · {s.draws}P
                  {s.byes > 0 ? ` · ${s.byes}B` : ""}
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="opacity-0 animate-pop [animation-delay:0.4s]">
        <h2 className="mb-3 px-1 font-display text-[0.78rem] font-bold uppercase tracking-[0.1em] text-ink-mid">
          Standings
        </h2>
        <div className="overflow-hidden rounded-2xl bg-card border-2 border-black/[0.06]">
          <ul>
            {rest.map((s, i) => {
              const isLast = i === rest.length - 1;
              return (
                <li
                  key={s.player_id}
                  className={`flex items-center px-3.5 py-3 sm:px-4 ${
                    isLast ? "" : "border-b border-black/[0.05]"
                  }`}
                >
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-black/[0.04] text-[0.72rem] font-bold text-ink-mid">
                    {s.rank}
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="truncate text-[0.88rem] font-semibold capitalize text-ink">
                      {s.player_name}
                    </div>
                    <div className="text-[0.66rem] text-ink-light">
                      {s.wins}V · {s.losses}S · {s.draws}P
                      {s.byes > 0 ? ` · ${s.byes}B` : ""}
                    </div>
                  </div>
                  <div className="flex-shrink-0 font-display text-[1.05rem] font-bold tabular-nums tracking-[-0.02em] text-ink">
                    {s.points}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </main>
  );
}
