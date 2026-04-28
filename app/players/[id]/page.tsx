import Link from "next/link";
import { notFound } from "next/navigation";
import BackLink from "../../components/BackLink";

type Player = {
  id: number;
  external_id: number;
  display_name: string;
};

type EventInfo = {
  id: number;
  season_id: number;
  name: string;
  format: string;
  played_at: string;
};

type PlayerEventEntry = {
  event: EventInfo;
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

async function getPlayer(id: string): Promise<Player | null> {
  const res = await fetch(`https://api.legapaupermilano.it/players/${id}`, {
    next: { revalidate: 60 },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load player: ${res.status}`);
  return res.json();
}

async function getPlayerEvents(id: string): Promise<PlayerEventEntry[]> {
  const res = await fetch(
    `https://api.legapaupermilano.it/players/${id}/events?season=1`,
    { next: { revalidate: 60 } },
  );
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Failed to load player events: ${res.status}`);
  return res.json();
}

function shortEventName(name: string): string {
  const match = name.match(/Tappa\s+\d+/i);
  return match ? match[0] : name;
}

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function PlayerDetailPage(
  props: PageProps<"/players/[id]">,
) {
  const { id } = await props.params;
  const [player, entries] = await Promise.all([
    getPlayer(id),
    getPlayerEvents(id),
  ]);
  if (!player) notFound();

  const sorted = [...entries].sort(
    (a, b) =>
      new Date(b.event.played_at).getTime() -
      new Date(a.event.played_at).getTime(),
  );

  const totalPoints = entries.reduce((sum, e) => sum + e.points, 0);
  const totalWins = entries.reduce((sum, e) => sum + e.wins, 0);
  const totalLosses = entries.reduce((sum, e) => sum + e.losses, 0);
  const totalDraws = entries.reduce((sum, e) => sum + e.draws, 0);
  const bestRank = entries.length
    ? Math.min(...entries.map((e) => e.rank))
    : null;

  return (
    <main className="mx-auto w-full max-w-[720px] px-5 pt-8 pb-20 sm:px-5 sm:pt-10 sm:pb-20">
      <BackLink />

      <header className="mt-5 mb-8 animate-pop">
        <div className="mb-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-ink-light">
          Giocatore
        </div>
        <h1 className="mb-2 font-display text-[1.6rem] font-bold capitalize tracking-[-0.02em] text-ink sm:text-[2rem]">
          {player.display_name}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.78rem] font-medium text-ink-light">
          <span>
            <strong className="font-bold text-ink">{entries.length}</strong>{" "}
            tappe
          </span>
          {bestRank !== null && (
            <>
              <span aria-hidden>·</span>
              <span>
                Best:{" "}
                <strong className="font-bold text-ink">#{bestRank}</strong>
              </span>
            </>
          )}
        </div>
        <div className="mt-3.5 h-[3px] w-8 rounded-sm bg-red-accent" />
      </header>

      <section className="mb-8 grid grid-cols-2 gap-2 opacity-0 animate-pop [animation-delay:0.1s] sm:grid-cols-4">
        <div className="rounded-2xl bg-red-accent px-4 py-3.5 text-white shadow-[0_8px_30px_rgba(239,68,68,0.2)]">
          <div className="text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-white/60">
            Punti totali
          </div>
          <div className="mt-1 font-display text-[1.7rem] font-bold leading-none tracking-[-0.02em]">
            {totalPoints}
          </div>
        </div>
        <div className="rounded-2xl bg-card border-2 border-black/[0.06] px-4 py-3.5">
          <div className="text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-ink-light">
            Vittorie
          </div>
          <div className="mt-1 font-display text-[1.7rem] font-bold leading-none tracking-[-0.02em] text-ink">
            {totalWins}
          </div>
        </div>
        <div className="rounded-2xl bg-card border-2 border-black/[0.06] px-4 py-3.5">
          <div className="text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-ink-light">
            Sconfitte
          </div>
          <div className="mt-1 font-display text-[1.7rem] font-bold leading-none tracking-[-0.02em] text-ink">
            {totalLosses}
          </div>
        </div>
        <div className="rounded-2xl bg-card border-2 border-black/[0.06] px-4 py-3.5">
          <div className="text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-ink-light">
            Patte
          </div>
          <div className="mt-1 font-display text-[1.7rem] font-bold leading-none tracking-[-0.02em] text-ink">
            {totalDraws}
          </div>
        </div>
      </section>

      <section className="opacity-0 animate-pop [animation-delay:0.25s]">
        <h2 className="mb-3 px-1 font-display text-[0.78rem] font-bold uppercase tracking-[0.1em] text-ink-mid">
          Tappe giocate
        </h2>
        {sorted.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-black/[0.08] px-5 py-8 text-center text-[0.85rem] text-ink-light">
            Nessuna tappa giocata.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {sorted.map((entry) => {
              const { event } = entry;
              const isPodium = entry.rank <= 3;
              return (
                <li key={event.id}>
                  <Link
                    href={`/events/${event.id}`}
                    className="group flex items-center gap-3 rounded-2xl bg-card border-2 border-black/[0.06] px-4 py-3.5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)] sm:px-5 sm:py-4"
                  >
                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] text-[0.85rem] font-bold ${
                        isPodium
                          ? "bg-red-bg text-red-accent"
                          : "bg-black/[0.04] text-ink-mid"
                      }`}
                    >
                      #{entry.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.92rem] font-semibold text-ink sm:text-[0.98rem]">
                        {shortEventName(event.name)}
                      </div>
                      <div className="text-[0.66rem] text-ink-light">
                        {formatEventDate(event.played_at)} · {entry.wins}V ·{" "}
                        {entry.losses}S · {entry.draws}P
                        {entry.byes > 0 ? ` · ${entry.byes}B` : ""}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="font-display text-[1.25rem] font-bold tabular-nums tracking-[-0.02em] text-ink">
                        {entry.points}
                      </div>
                      <div className="text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-ink-light">
                        Punti
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
