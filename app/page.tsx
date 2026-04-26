type LeaderboardEntry = {
  player_id: number;
  display_name: string;
  total_points: number;
  events_played: number;
};

async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const res = await fetch(
    "http://api.legapaupermilano.it/seasons/1/leaderboard",
    { next: { revalidate: 60 } },
  );
  if (!res.ok) throw new Error(`Failed to load leaderboard: ${res.status}`);
  return res.json();
}

const medalFor = (rank: number) =>
  rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

export default async function Home() {
  const entries = await getLeaderboard();

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 font-sans text-zinc-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.25),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(244,63,94,0.2),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_85%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-6 pt-24 pb-32">
        <section className="flex flex-col items-center gap-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-zinc-300 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Stagione 1 — in corso
          </span>

          <h1 className="bg-gradient-to-br from-white via-zinc-200 to-zinc-500 bg-clip-text text-6xl font-black tracking-tight text-transparent drop-shadow-[0_0_40px_rgba(168,85,247,0.25)] sm:text-8xl">
            Lega Pauper
            <br />
            Milano
          </h1>

          <p className="max-w-md text-lg text-zinc-400 sm:text-xl">
            Tutti i giovedì in{" "}
            <span className="font-semibold text-zinc-100">UESM</span> alle{" "}
            <span className="font-semibold text-zinc-100">20:30</span>
          </p>
        </section>

        <section className="mt-24 w-full">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Classifica
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {entries.length} giocatori
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur">
            <div className="grid grid-cols-[3rem_1fr_auto] gap-4 border-b border-white/10 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              <span>#</span>
              <span>Giocatore</span>
              <span className="text-right">Punti</span>
            </div>
            <ul>
              {entries.map((entry, index) => {
                const rank = index + 1;
                const medal = medalFor(rank);
                return (
                  <li
                    key={entry.player_id}
                    className="grid grid-cols-[3rem_1fr_auto] items-center gap-4 border-b border-white/5 px-5 py-3 text-sm transition hover:bg-white/[0.04] last:border-b-0"
                  >
                    <span className="flex items-center gap-1 font-mono text-zinc-500">
                      {medal ? (
                        <span className="text-base">{medal}</span>
                      ) : (
                        <span className="tabular-nums">{rank}</span>
                      )}
                    </span>
                    <span className="truncate font-medium text-zinc-100">
                      {entry.display_name}
                    </span>
                    <span className="w-16 text-right font-bold tabular-nums text-white">
                      {entry.total_points}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
