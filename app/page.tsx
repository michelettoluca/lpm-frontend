import Link from "next/link";

type LeaderboardEntry = {
  player_id: number;
  display_name: string;
  total_points: number;
  events_played: number;
};

type EventSummary = {
  id: number;
  season_id: number;
  name: string;
  format: string;
  played_at: string;
};

async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const res = await fetch(
    "https://api.legapaupermilano.it/seasons/1/leaderboard",
    { next: { revalidate: 60 } },
  );
  if (!res.ok) throw new Error(`Failed to load leaderboard: ${res.status}`);
  return res.json();
}

async function getEvents(): Promise<EventSummary[]> {
  const res = await fetch(
    "https://api.legapaupermilano.it/seasons/1/events",
    { next: { revalidate: 60 } },
  );
  if (!res.ok) throw new Error(`Failed to load events: ${res.status}`);
  return res.json();
}

function shortEventName(name: string): string {
  const match = name.match(/Tappa\s+\d+/i);
  return match ? match[0] : name;
}

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type PodiumProps = {
  rank: 1 | 2 | 3;
  entry: LeaderboardEntry;
};

function PodiumCard({ rank, entry }: PodiumProps) {
  const isFirst = rank === 1;

  const cardClasses = isFirst
    ? "bg-red-accent shadow-[0_8px_30px_rgba(239,68,68,0.2),0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_14px_40px_rgba(239,68,68,0.25),0_4px_12px_rgba(0,0,0,0.08)] [animation-delay:0.1s]"
    : rank === 2
      ? "bg-card border-2 border-black/[0.06] hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)] [animation-delay:0.2s]"
      : "bg-card border-2 border-black/[0.06] hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)] [animation-delay:0.3s]";

  const watermarkColor = isFirst ? "text-white/[0.12]" : "text-black/[0.04]";
  const watermarkSize = isFirst ? "text-[6rem] -top-2" : "text-[5rem] -top-1.5";

  const topPadding = isFirst
    ? "pt-9 px-4.5 pb-14 sm:pt-9 sm:px-4.5 sm:pb-14"
    : rank === 3
      ? "pt-5.5 px-3.5 pb-10"
      : "pt-7 px-3.5 pb-12";

  const nameColor = isFirst ? "text-white" : "text-ink";
  const pointsColor = isFirst ? "text-white" : "text-ink";
  const labelColor = isFirst ? "text-white/50" : "text-ink-light";
  const statValueColor = isFirst ? "text-white" : "text-ink";
  const statLabelColor = isFirst ? "text-white/45" : "text-ink-light";
  const statBorderColor = isFirst ? "border-white/15" : "border-black/[0.05]";

  const pointsSize = isFirst
    ? "text-[2.6rem] sm:text-[3.4rem]"
    : "text-[2.1rem] sm:text-[2.8rem]";
  const nameSize = isFirst
    ? "text-[0.92rem] sm:text-[1.15rem]"
    : "text-[0.82rem] sm:text-[1rem]";

  const mobileWatermark = isFirst ? "text-white/[0.12]" : "text-black/[0.04]";

  return (
    <>
      {/* Mobile: compact horizontal card */}
      <div
        className={`relative flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-3 text-left opacity-0 animate-pop transition-transform duration-200 ease-out sm:hidden ${cardClasses}`}
      >
        <span
          aria-hidden
          className={`pointer-events-none absolute -left-1 -top-1 select-none font-display text-[3.2rem] font-bold leading-none ${mobileWatermark}`}
        >
          #{rank}
        </span>

        <div className="relative z-10 ml-10 flex-1 min-w-0">
          <div className={`truncate font-semibold capitalize ${nameColor} text-[0.95rem]`}>
            {entry.display_name}
          </div>
          <div className={`text-[0.65rem] ${labelColor}`}>
            {entry.events_played} tappe
          </div>
        </div>

        <span
          className={`relative z-10 flex-shrink-0 font-display font-bold leading-none tracking-[-0.02em] text-[1.6rem] ${pointsColor}`}
        >
          {entry.total_points}
        </span>
      </div>

      {/* Desktop: full podium card */}
      <div
        className={`relative hidden overflow-hidden rounded-[20px] text-center opacity-0 animate-pop transition-transform duration-200 ease-out hover:-translate-y-1 sm:block ${cardClasses}`}
      >
        <div
          className={`pointer-events-none absolute -left-0.5 select-none font-display font-bold leading-none ${watermarkColor} ${watermarkSize}`}
        >
          #{rank}
        </div>

        <div className={`relative z-10 ${topPadding}`}>
          <div className={`mb-2 font-semibold capitalize ${nameColor} ${nameSize}`}>
            {entry.display_name}
          </div>
          <div
            className={`font-display font-bold leading-none tracking-[-0.03em] ${pointsColor} ${pointsSize}`}
          >
            {entry.total_points}
          </div>
        </div>

        <div
          className={`relative z-10 border-t-2 px-2 py-2.5 text-center ${statBorderColor}`}
        >
          <div
            className={`mb-0.5 font-display font-bold leading-none text-[0.82rem] sm:text-base ${statValueColor}`}
          >
            {entry.events_played}
          </div>
          <div
            className={`text-[0.48rem] font-semibold uppercase tracking-[0.08em] sm:text-[0.55rem] ${statLabelColor}`}
          >
            Tappe
          </div>
        </div>
      </div>
    </>
  );
}

export default async function Home() {
  const [entries, eventsRaw] = await Promise.all([
    getLeaderboard(),
    getEvents(),
  ]);
  const events = [...eventsRaw].sort(
    (a, b) =>
      new Date(b.played_at).getTime() - new Date(a.played_at).getTime(),
  );

  const first = entries[0];
  const second = entries[1];
  const third = entries[2];
  const top58 = entries.slice(3, 8);
  const hasMore = entries.length > 8;

  return (
    <>
      <header className="relative w-full overflow-hidden bg-gradient-to-br from-[#1a1a1a] via-[#222] to-[#0f0f0f] px-6 pt-12 pb-14 text-center shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)] animate-pop sm:pt-16 sm:pb-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full bg-red-accent/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-red-accent/15 blur-3xl"
        />

        <div className="relative z-10 mx-auto flex w-full max-w-[720px] flex-col items-center">
          <h1 className="mb-3 font-display text-[1.75rem] font-bold leading-[1.05] tracking-[-0.03em] text-white sm:text-[2.6rem]">
            Lega Pauper{" "}
            <span className="text-red-accent">Milano</span>
          </h1>

          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-red-accent animate-pulse" />
            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-white/80">
              Summer 2026
            </span>
          </div>

          <div className="flex items-center gap-5 text-white/85 sm:gap-7">
            <div className="text-center">
              <div className="font-display text-[1.4rem] font-bold leading-none tracking-[-0.02em] text-white sm:text-[1.7rem]">
                {entries.length}
              </div>
              <div className="mt-1 text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-white/55">
                Giocatori
              </div>
            </div>
            <div className="h-7 w-px bg-white/15" />
            <div className="text-center">
              <div className="font-display text-[1.4rem] font-bold leading-none tracking-[-0.02em] text-white sm:text-[1.7rem]">
                {events.length}
              </div>
              <div className="mt-1 text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-white/55">
                Tappe
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[720px] px-5 pt-10 pb-20 sm:px-5 sm:pt-12 sm:pb-20">

      <section className="mb-10 flex flex-col gap-3 sm:grid sm:grid-cols-[1fr_1.15fr_1fr] sm:items-end sm:gap-3">
        {second && (
          <div className="order-2 sm:order-none">
            <PodiumCard rank={2} entry={second} />
          </div>
        )}
        {first && (
          <div className="order-1 sm:order-none">
            <PodiumCard rank={1} entry={first} />
          </div>
        )}
        {third && (
          <div className="order-3 sm:order-none">
            <PodiumCard rank={3} entry={third} />
          </div>
        )}
      </section>

      <section className="opacity-0 animate-pop [animation-delay:0.45s]">
        <ul>
          {top58.map((entry, i) => {
            const rank = i + 4;
            return (
              <li
                key={entry.player_id}
                className={`group relative flex items-center overflow-hidden px-3.5 py-3 transition-all duration-150 hover:bg-black/[0.015] hover:pl-5 sm:px-5 sm:py-3.5 ${rank < 8 ? "border-b-2 border-black/[0.04]" : ""}`}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-[55px] top-1/2 -translate-y-1/2 select-none font-display text-[3.5rem] font-bold leading-none text-black/[0.025]"
                >
                  #{rank}
                </span>

                <div className="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] bg-black/[0.04] text-[0.8rem] font-bold text-ink-mid">
                  {rank}
                </div>

                <div className="relative z-10 ml-3.5 flex-1">
                  <div className="mb-0.5 text-[0.95rem] font-semibold capitalize text-ink">
                    {entry.display_name}
                  </div>
                  <div className="text-[0.68rem] text-ink-light">
                    {entry.events_played} tappe
                  </div>
                </div>

                <div className="relative z-10 flex-shrink-0 font-display text-[1.5rem] font-bold tracking-[-0.02em] text-ink">
                  {entry.total_points}
                </div>
              </li>
            );
          })}
        </ul>

        {hasMore && (
          <Link
            href="/leaderboard"
            className="group mt-4 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-black/[0.08] px-5 py-3.5 text-[0.82rem] font-semibold text-ink-mid transition-all duration-150 hover:border-red-accent/40 hover:bg-red-bg hover:text-red-accent"
          >
            Classifica completa
            <span
              aria-hidden
              className="text-[1.05rem] transition-transform duration-150 group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        )}
      </section>

      <section className="mt-14 opacity-0 animate-pop [animation-delay:0.6s]">
        <h2 className="mb-4 font-display text-[1.05rem] font-bold uppercase tracking-[0.08em] text-ink-mid sm:text-[1.15rem]">
          Tappe
        </h2>
        <ul className="flex flex-col gap-2">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/events/${event.id}`}
                className="group flex items-center gap-3 rounded-2xl bg-card border-2 border-black/[0.06] px-4 py-3.5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)] sm:px-5 sm:py-4"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] bg-red-bg text-[0.95rem] font-bold text-red-accent">
                  {event.id}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.9rem] font-semibold text-ink sm:text-[0.98rem]">
                    {shortEventName(event.name)}
                  </div>
                  <div className="text-[0.68rem] text-ink-light">
                    {formatEventDate(event.played_at)}
                  </div>
                </div>
                <span
                  aria-hidden
                  className="flex-shrink-0 text-[1.1rem] text-ink-light transition-transform duration-150 group-hover:translate-x-1 group-hover:text-red-accent"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
    </>
  );
}
