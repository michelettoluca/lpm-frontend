type LeaderboardEntry = {
  player_id: number;
  display_name: string;
  total_points: number;
  events_played: number;
};

async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const res = await fetch(
    "https://api.legapaupermilano.it/seasons/1/leaderboard",
    { next: { revalidate: 60 } },
  );
  if (!res.ok) throw new Error(`Failed to load leaderboard: ${res.status}`);
  return res.json();
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
  const entries = await getLeaderboard();

  const first = entries[0];
  const second = entries[1];
  const third = entries[2];
  const rest = entries.slice(3);

  return (
    <main className="mx-auto w-full max-w-[720px] px-5 pt-10 pb-20 sm:px-5 sm:pt-10 sm:pb-20">
      <header className="mb-10 text-center animate-pop">
        <h1 className="mb-1 font-display text-[1.4rem] font-bold tracking-[-0.02em] text-ink sm:text-[1.8rem]">
          Lega Pauper Milano
        </h1>
        <p className="text-[0.82rem] font-medium text-ink-light">
          Summer 2026
        </p>
        <div className="mx-auto mt-3.5 h-[3px] w-8 rounded-sm bg-red-accent" />
      </header>

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
          {rest.map((entry, i) => {
            const rank = i + 4;
            const isTop = rank <= 8;

            if (isTop) {
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
            }

            return (
              <li
                key={entry.player_id}
                className={`group relative flex items-center overflow-hidden px-3.5 py-1.5 transition-all duration-150 hover:bg-black/[0.015] hover:pl-5 sm:px-5 ${rank === 9 ? "mt-6" : ""}`}
              >
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-black/[0.04] text-[0.65rem] font-bold text-ink-mid">
                  {rank}
                </div>

                <div className="ml-2.5 flex flex-1 items-baseline gap-2 min-w-0">
                  <span className="truncate text-[0.78rem] font-semibold capitalize text-ink">
                    {entry.display_name}
                  </span>
                  <span className="flex-shrink-0 text-[0.6rem] text-ink-light">
                    {entry.events_played} tappe
                  </span>
                </div>

                <div className="flex-shrink-0 font-display text-[1rem] font-bold tracking-[-0.02em] text-ink tabular-nums">
                  {entry.total_points}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
