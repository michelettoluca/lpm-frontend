import Link from "next/link";
import { notFound } from "next/navigation";
import BackLink from "../../components/BackLink";
import {
  AccentCard,
  Chip,
  EmptyRow,
  PAGE,
  PointsChip,
  PositionTile,
  SectionHead,
  TopBar,
} from "../../components/ui";
import {
  getEvents,
  getLatestSeason,
  getLeaderboard,
  getPlayer,
  getPlayerEvents,
} from "../../lib/api";
import {
  isPlayed,
  record,
  splitName,
  tappaTitle,
  winPct,
} from "../../lib/format";

const PRIZE_POINTS = 9;

function Tile({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[20px] border border-ink/10 bg-white px-3 pt-3 pb-2.5 lg:px-3.5 lg:pt-3.5 lg:pb-3 ${className}`}
    >
      <div className="lbl">{label}</div>
      <div className="tn mt-1.5 text-[30px] font-extrabold leading-none tracking-[-0.04em] lg:mt-2 lg:text-[36px]">
        {children}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="lbl flex gap-3.5">
      <span>
        <span className="text-accent">■</span> Vinte
      </span>
      <span>
        <span className="text-ink">■</span> Sconfitte
      </span>
      <span>
        <span className="text-draw">■</span> Pari
      </span>
    </div>
  );
}

function Bar({ w, l, d, className }: { w: number; l: number; d: number; className: string }) {
  if (w + l + d === 0) return <div className={`${className} rounded-full bg-draw`} />;
  return (
    <div className={`flex gap-0.5 overflow-hidden rounded-full ${className}`}>
      {w > 0 && <div style={{ flex: w }} className="bg-accent" />}
      {l > 0 && <div style={{ flex: l }} className="bg-ink" />}
      {d > 0 && <div style={{ flex: d }} className="bg-draw" />}
    </div>
  );
}

export default async function PlayerDetailPage(
  props: PageProps<"/players/[id]">,
) {
  const { id } = await props.params;
  const [player, entries, leaderboard, events, season] = await Promise.all([
    getPlayer(id),
    getPlayerEvents(id),
    getLeaderboard(),
    getEvents(),
    getLatestSeason(),
  ]);
  if (!player) notFound();

  const tappe = [...entries].sort(
    (a, b) =>
      new Date(b.event.played_at).getTime() -
      new Date(a.event.played_at).getTime(),
  );
  const rankIndex = leaderboard.findIndex((e) => e.player_id === player.id);
  const seasonRank = rankIndex >= 0 ? rankIndex + 1 : null;
  const seasonPoints =
    rankIndex >= 0
      ? leaderboard[rankIndex].total_points
      : entries.reduce((s, e) => s + e.points, 0);
  const w = entries.reduce((s, e) => s + e.wins, 0);
  const l = entries.reduce((s, e) => s + e.losses, 0);
  const d = entries.reduce((s, e) => s + e.draws, 0);
  const matches = w + l + d;
  const playedSoFar = events.filter((e) => isPlayed(e.played_at)).length;
  const { first, last } = splitName(player.display_name);

  return (
    <main className={PAGE}>
      <TopBar
        className="lg:mb-7"
        left={<BackLink href="/leaderboard" label="Classifica" />}
        right={
          <Chip rotate={-3}>
            {seasonRank === null ? "fuori classifica" : `posizione #${seasonRank}`}
          </Chip>
        }
      />

      <div className="lg:mb-9 lg:grid lg:grid-cols-[1fr_auto] lg:items-end lg:gap-12">
        <div className="min-w-0">
          <h1 className="mt-[26px] mb-1.5 line-clamp-2 overflow-hidden text-[44px] font-extrabold capitalize leading-[0.95] tracking-[-0.04em] break-words lg:mt-0 lg:mb-3 lg:text-[84px] lg:leading-[0.92] lg:tracking-[-0.045em]">
            {first}
            {last && (
              <>
                <br className="lg:hidden" />
                <span className="hidden lg:inline"> </span>
                {last}
              </>
            )}
          </h1>
          <div className="mb-[18px] text-[13px] text-ink/60 lg:mb-0 lg:text-[14px]">
            Lega Pauper Milano{season && ` · ${season.name}`}
            <span className="hidden lg:inline">
              {" "}· {matches} {matches === 1 ? "partita" : "partite"}
            </span>
          </div>
        </div>

        <div className="mb-[22px] grid grid-cols-3 gap-2 lg:mb-0 lg:grid-cols-[repeat(4,132px)] lg:gap-2.5">
          <AccentCard outer="rounded-[20px]" inner="rounded-[19px]">
            <div className="px-3 pt-3 pb-2.5 lg:px-3.5 lg:pt-3.5 lg:pb-3">
              <div className="lbl">Punti</div>
              <div className="tn mt-1.5 text-[30px] font-extrabold leading-none tracking-[-0.04em] text-accent lg:mt-2 lg:text-[36px]">
                {seasonPoints}
              </div>
            </div>
          </AccentCard>
          <Tile label="Posizione">{seasonRank === null ? "–" : seasonRank}</Tile>
          <Tile label="Tappe">
            {entries.length}
            <span className="text-[16px] font-semibold text-ink/45 lg:text-[18px]">
              /{playedSoFar}
            </span>
          </Tile>
          <Tile label="Win" className="hidden lg:block">
            {winPct(w, l, d)}
          </Tile>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[1.5fr_1fr] lg:items-start lg:gap-8">
        <div>
          <div className="lbl grid grid-cols-[48px_1fr_auto] gap-2.5 pr-4 pb-2 pl-3 lg:grid-cols-[52px_1fr_auto] lg:gap-3 lg:pr-5 lg:pb-2.5">
            <span />
            <span>Tappe giocate</span>
            <span className="min-w-[34px] text-center lg:min-w-[38px]">Pt</span>
          </div>
          <div className="card">
            {tappe.length === 0 ? (
              <EmptyRow>Nessuna tappa giocata.</EmptyRow>
            ) : (
              <ul>
                {tappe.map((t) => {
                  const prize = t.points >= PRIZE_POINTS;
                  return (
                    <li key={t.event.id} className="border-b border-ink/8 last:border-b-0">
                      <Link
                        href={`/events/${t.event.id}`}
                        className="row-link grid grid-cols-[48px_1fr_auto] items-center gap-2.5 py-2.5 pr-4 pl-3 lg:grid-cols-[52px_1fr_auto] lg:gap-3 lg:py-3 lg:pr-5"
                      >
                        <PositionTile rank={t.rank} prize={prize} />
                        <div className="min-w-0">
                          <div className="truncate text-[14px] font-bold leading-[1.2] lg:text-[15px]">
                            {tappaTitle(t.event.name)}
                          </div>
                          <div className="tn mt-px text-[12px] text-ink/50">
                            {record(t.wins, t.losses, t.draws)}
                          </div>
                        </div>
                        <PointsChip points={t.points} prize={prize} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Stagione — mobile */}
          <div className="lg:hidden">
            <SectionHead
              className="mt-7 mb-2.5"
              title="Stagione"
              aside={`${matches} ${matches === 1 ? "partita" : "partite"}`}
            />
            <div className="mb-2 grid grid-cols-3 gap-2">
              {[
                ["V", w],
                ["S", l],
                ["P", d],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[18px] border border-ink/10 bg-white p-3"
                >
                  <div className="lbl">{label}</div>
                  <div className="tn text-[26px] font-extrabold tracking-[-0.03em]">
                    {value}
                  </div>
                </div>
              ))}
            </div>
            <div className="mb-2.5 rounded-[18px] border border-ink/10 bg-white p-3">
              <div className="lbl">Win</div>
              <div className="tn text-[26px] font-extrabold tracking-[-0.03em] text-accent">
                {winPct(w, l, d)}
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-[18px] border border-ink/10 bg-white px-4 py-3">
              <Bar w={w} l={l} d={d} className="h-2" />
              <Legend />
            </div>
          </div>

        </div>

        {/* Stagione — desktop */}
        <div className="hidden lg:block">
          <div className="lbl flex items-baseline justify-between px-5 pb-2.5">
            <span>Stagione</span>
            <span>V-S-P</span>
          </div>
          <div className="flex flex-col gap-4 rounded-[18px] border border-ink/10 bg-white px-5 py-4">
            <div className="flex gap-6">
              {[
                ["V", w],
                ["S", l],
                ["P", d],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="lbl">{label}</div>
                  <div className="tn text-[28px] font-extrabold tracking-[-0.03em]">
                    {value}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <Bar w={w} l={l} d={d} className="h-2.5" />
              <Legend />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
