import Link from "next/link";

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

export default async function LeaderboardPage() {
  const entries = await getLeaderboard();

  return (
    <main className="mx-auto w-full max-w-[720px] px-5 pt-8 pb-20 sm:px-5 sm:pt-10 sm:pb-20">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[0.78rem] font-semibold text-ink-light transition-colors duration-150 hover:text-red-accent"
      >
        <span aria-hidden>←</span> Home
      </Link>

      <header className="mt-5 mb-8 animate-pop">
        <h1 className="mb-1 font-display text-[1.4rem] font-bold tracking-[-0.02em] text-ink sm:text-[1.8rem]">
          Classifica completa
        </h1>
        <p className="text-[0.82rem] font-medium text-ink-light">
          Summer 2026 · {entries.length} giocatori
        </p>
        <div className="mt-3.5 h-[3px] w-8 rounded-sm bg-red-accent" />
      </header>

      <section className="opacity-0 animate-pop [animation-delay:0.15s]">
        <div className="overflow-hidden rounded-2xl bg-card border-2 border-black/[0.06]">
          <ul>
            {entries.map((entry, i) => {
              const rank = i + 1;
              const isLast = i === entries.length - 1;
              return (
                <li
                  key={entry.player_id}
                  className={isLast ? "" : "border-b border-black/[0.05]"}
                >
                  <Link
                    href={`/players/${entry.player_id}`}
                    className="flex items-center px-3.5 py-3 transition-colors duration-150 hover:bg-black/[0.02] sm:px-4 sm:py-3.5"
                  >
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] text-[0.78rem] font-bold ${
                        rank <= 3
                          ? "bg-red-bg text-red-accent"
                          : "bg-black/[0.04] text-ink-mid"
                      }`}
                    >
                      {rank}
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="truncate text-[0.92rem] font-semibold capitalize text-ink">
                        {entry.display_name}
                      </div>
                      <div className="text-[0.66rem] text-ink-light">
                        {entry.events_played} tappe
                      </div>
                    </div>
                    <div className="flex-shrink-0 font-display text-[1.15rem] font-bold tabular-nums tracking-[-0.02em] text-ink">
                      {entry.total_points}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </main>
  );
}
