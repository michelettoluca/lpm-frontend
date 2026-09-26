import Link from "next/link";
import type { H2HOpponent, PlayerEventEntry } from "../../lib/api";
import { SectionHead } from "../../components/ui";

const TOP_CUT = 8;

type Rival = { id: number; name: string; count: number; record: string };

type Stats = {
  events: number;
  bestRank: number;
  bestRankTimes: number;
  avgRank: number;
  topCut: number;
  totalPoints: number;
  avgPoints: number;
  gamesWon: number;
  gamesLost: number;
  gamesDrawn: number;
  matchWins: number;
  cleanWins: number;
  longestStreak: number;
  avgOmw: number;
  opponents: number;
  mostFaced: Rival | null;
  nemesis: Rival | null;
  victim: Rival | null;
};

/**
 * Season statistics over every tappa and every match the player took part
 * in, including tappe that fall outside the season's counted results.
 */
export function computeStats(entries: PlayerEventEntry[], opponents: H2HOpponent[]): Stats | null {
  if (entries.length === 0) return null;

  const ranks = entries.map((e) => e.rank);
  const bestRank = Math.min(...ranks);
  const totalPoints = entries.reduce((s, e) => s + e.points, 0);

  const playedAt = new Map(entries.map((e) => [e.event.id, new Date(e.event.played_at).getTime()]));
  const matches = opponents.flatMap((o) => o.matches);
  const gamesWon = matches.reduce((s, m) => s + m.wins, 0);
  const gamesLost = matches.reduce((s, m) => s + m.losses, 0);
  const gamesDrawn = matches.reduce((s, m) => s + m.draws, 0);
  const won = matches.filter((m) => m.wins > m.losses);

  // Longest run of won matches in play order. Byes have no opponent, so they
  // are not in the head-to-head data and neither extend nor break a run.
  const ordered = [...matches].sort(
    (a, b) => (playedAt.get(a.event_id) ?? 0) - (playedAt.get(b.event_id) ?? 0) || a.round_no - b.round_no,
  );
  let run = 0;
  let longestStreak = 0;
  for (const m of ordered) {
    run = m.wins > m.losses ? run + 1 : 0;
    longestStreak = Math.max(longestStreak, run);
  }

  const rivals = opponents.map((o) => {
    let w = 0;
    let l = 0;
    let d = 0;
    for (const m of o.matches) {
      if (m.wins > m.losses) w++;
      else if (m.losses > m.wins) l++;
      else d++;
    }
    return { id: o.opponent_id, name: o.opponent_name, played: o.matches.length, w, l, record: `${w}-${l}-${d}` };
  });
  // A rival only means something once it happened more than once.
  const pick = (score: (r: (typeof rivals)[number]) => number, tie: (r: (typeof rivals)[number]) => number) => {
    const best = [...rivals].sort((a, b) => score(b) - score(a) || tie(a) - tie(b) || a.name.localeCompare(b.name))[0];
    return best && score(best) >= 2 ? { id: best.id, name: best.name, count: score(best), record: best.record } : null;
  };

  return {
    events: entries.length,
    bestRank,
    bestRankTimes: ranks.filter((r) => r === bestRank).length,
    avgRank: ranks.reduce((s, r) => s + r, 0) / ranks.length,
    topCut: ranks.filter((r) => r <= TOP_CUT).length,
    totalPoints,
    avgPoints: totalPoints / entries.length,
    gamesWon,
    gamesLost,
    gamesDrawn,
    matchWins: won.length,
    cleanWins: won.filter((m) => m.losses === 0 && m.draws === 0).length,
    longestStreak,
    avgOmw: entries.reduce((s, e) => s + e.omw, 0) / entries.length,
    opponents: opponents.length,
    mostFaced: pick((r) => r.played, (r) => -r.w),
    nemesis: pick((r) => r.l, (r) => r.w),
    victim: pick((r) => r.w, (r) => r.l),
  };
}

const num = (n: number, digits = 1) => n.toLocaleString("it-IT", { maximumFractionDigits: digits });
const pct = (part: number, whole: number) => (whole === 0 ? "–" : `${Math.round((part / whole) * 100)}%`);

function StatTile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="bg-white px-3.5 py-2.5 lg:px-4 lg:py-3">
      <div className="lbl truncate">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="tn text-[20px] font-extrabold leading-none tracking-[-0.03em] lg:text-[22px]">{value}</span>
        {sub && <span className="tn truncate text-[11px] text-ink/45">{sub}</span>}
      </div>
    </div>
  );
}

function RivalRow({ label, rival, detail }: { label: string; rival: Rival; detail: string }) {
  return (
    <li className="border-b border-ink/8 last:border-b-0">
      <Link
        href={`/players/${rival.id}`}
        className="row-link grid grid-cols-[104px_1fr_auto] items-center gap-3 px-3.5 py-2 lg:grid-cols-[120px_1fr_auto] lg:px-4"
      >
        <span className="lbl">{label}</span>
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-[14px] font-bold capitalize">{rival.name}</span>
          <span className="shrink-0 text-[11px] text-ink/45">{detail}</span>
        </div>
        <span className="tn text-[14px] font-extrabold tracking-[-0.02em]">{rival.record}</span>
      </Link>
    </li>
  );
}

export default function PlayerStats({ stats }: { stats: Stats }) {
  const games = stats.gamesWon + stats.gamesLost + stats.gamesDrawn;
  const rivals = [
    stats.mostFaced && { label: "Più affrontato", rival: stats.mostFaced, detail: `${stats.mostFaced.count} partite` },
    stats.nemesis && { label: "Bestia nera", rival: stats.nemesis, detail: `${stats.nemesis.count} sconfitte` },
    stats.victim && { label: "Vittima preferita", rival: stats.victim, detail: `${stats.victim.count} vittorie` },
  ].filter((r) => r !== null);

  return (
    <section>
      <SectionHead
        className="mb-2.5 lg:mb-3"
        title="Riepilogo"
        aside="Tutte le tappe, anche quelle scartate"
      />
      {/* Hairline grid: the 1px gaps let the frame's colour show as dividers. */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[22px] border border-ink/8 bg-ink/8 shadow-[var(--shadow-surface)] lg:grid-cols-4">
        <StatTile label="Miglior piazzamento" value={`${stats.bestRank}°`} sub={`×${stats.bestRankTimes}`} />
        <StatTile label="Piazzamento medio" value={`${num(stats.avgRank)}°`} />
        <StatTile label={`Top ${TOP_CUT}`} value={stats.topCut} sub={`su ${stats.events}`} />
        <StatTile label="Punti per tappa" value={num(stats.avgPoints)} sub={`${stats.totalPoints} tot`} />
        <StatTile label="Game vinti" value={pct(stats.gamesWon, games)} sub={`${stats.gamesWon}-${stats.gamesLost}-${stats.gamesDrawn}`} />
        <StatTile label="Vittorie 2-0" value={pct(stats.cleanWins, stats.matchWins)} sub={`${stats.cleanWins}/${stats.matchWins}`} />
        <StatTile label="Serie migliore" value={stats.longestStreak} sub="di fila" />
        <StatTile label="Forza avversari" value={pct(stats.avgOmw, 1)} sub={`${stats.opponents} avv.`} />
      </div>
      {rivals.length > 0 && (
        <div className="card mt-2">
          <ul>
            {rivals.map((r) => (
              <RivalRow key={r.label} label={r.label} rival={r.rival} detail={r.detail} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
