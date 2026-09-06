import Link from "next/link";
import {
  getEvent,
  getEvents,
  getActiveSeason,
  getLeaderboard,
  type EventSummary,
  type LeaderboardEntry,
} from "./lib/api";
import { eventYear, isCompleted, tappaTitle } from "./lib/format";
import {
  AccentCard,
  Brand,
  Chip,
  DashedLink,
  DateTile,
  EmptyRow,
  PAGE,
  RankRow,
  SectionHead,
  TopBar,
} from "./components/ui";

function Stat({
  value,
  suffix,
  label,
}: {
  value: number;
  suffix?: string;
  label: string;
}) {
  return (
    <div>
      <div className="tn text-[28px] font-extrabold leading-none tracking-[-0.03em] lg:text-[36px]">
        {value}
        {suffix && (
          <span className="text-[16px] font-semibold text-ink/45 lg:text-[20px]">
            {suffix}
          </span>
        )}
      </div>
      <div className="lbl mt-1 lg:mt-1.5">{label}</div>
    </div>
  );
}

function tappeLabel(n: number) {
  return `${n} ${n === 1 ? "tappa" : "tappe"}`;
}

function PodiumSide({ entry }: { entry: LeaderboardEntry }) {
  return (
    <Link
      href={`/players/${entry.player_id}`}
      className="mb-2.5 block rounded-[20px] border border-ink/10 bg-white px-1.5 pt-3.5 pb-3 transition-colors hover:bg-ink/4 lg:mb-0 lg:px-2.5 lg:pt-[18px] lg:pb-4"
    >
      <div className="break-words text-[12px] font-bold capitalize leading-[1.2] lg:text-[14px]">
        {entry.display_name}
      </div>
      <div className="tn mt-1.5 text-[40px] font-extrabold leading-none tracking-[-0.04em] text-accent lg:mt-2 lg:text-[52px]">
        {entry.total_points}
      </div>
      <div className="mt-2.5 text-[11px] text-ink/50 lg:mt-3 lg:text-[12px]">
        {tappeLabel(entry.events_played)}
      </div>
    </Link>
  );
}

function PodiumCenter({ entry }: { entry: LeaderboardEntry }) {
  return (
    <AccentCard
      outer="rounded-[24px] shadow-[0_12px_30px_rgba(255,45,26,0.14)] lg:rounded-[26px] lg:shadow-[0_14px_34px_rgba(255,45,26,0.14)]"
      inner="rounded-[23px] lg:rounded-[25px]"
    >
      <Link
        href={`/players/${entry.player_id}`}
        className="block rounded-[23px] px-2 pt-5 pb-3.5 transition-colors hover:bg-ink/4 lg:rounded-[25px] lg:px-2.5 lg:pt-[26px] lg:pb-[18px]"
      >
        <div className="break-words text-[13px] font-extrabold capitalize leading-[1.2] lg:text-[15px]">
          {entry.display_name}
        </div>
        <div className="tn mt-1.5 text-[56px] font-extrabold leading-none tracking-[-0.05em] text-accent lg:mt-2 lg:text-[76px]">
          {entry.total_points}
        </div>
        <div className="mt-3 text-[11px] text-ink/50 lg:mt-3.5 lg:text-[12px]">
          {tappeLabel(entry.events_played)}
        </div>
      </Link>
    </AccentCard>
  );
}

function TappeSection({
  played,
  upcoming,
  playerCounts,
  className = "",
}: {
  played: EventSummary[];
  upcoming: EventSummary[];
  playerCounts: number[];
  className?: string;
}) {
  if (played.length === 0 && upcoming.length === 0) {
    return (
      <section className={className}>
        <SectionHead className="mb-2.5 lg:mb-3" title="Tappe" />
        <div className="card">
          <EmptyRow>Nessuna tappa in programma.</EmptyRow>
        </div>
        <DashedLink href="/rules">Regolamento e informazioni →</DashedLink>
      </section>
    );
  }

  return (
    <section className={className}>
      <SectionHead
        className="mb-2.5 lg:mb-3"
        title="Tappe concluse"
        aside={played.length > 0 ? tappeLabel(played.length) : undefined}
      />
      <div className="card">
        {played.length === 0 ? (
          <EmptyRow>Nessuna tappa giocata finora.</EmptyRow>
        ) : (
          <ul>
            {played.map((event, i) => (
              <TappaRow key={event.id} event={event} players={playerCounts[i]} />
            ))}
          </ul>
        )}
      </div>

      <SectionHead
        className="mt-7 mb-2.5 lg:mt-8 lg:mb-3"
        title="Prossime tappe"
        aside={upcoming.length > 0 ? tappeLabel(upcoming.length) : undefined}
      />
      <div className="card">
        {upcoming.length === 0 ? (
          <EmptyRow>Nessuna tappa in programma.</EmptyRow>
        ) : (
          <ul>
            {upcoming.map((event) => (
              <TappaRow key={event.id} event={event} />
            ))}
          </ul>
        )}
      </div>

      <DashedLink href="/rules">Regolamento e informazioni →</DashedLink>
    </section>
  );
}

function TappaRow({
  event,
  players,
}: {
  event: EventSummary;
  players?: number;
}) {
  const grid =
    "grid grid-cols-[48px_1fr_auto] items-center gap-2.5 py-2.5 pr-4 pl-3 lg:grid-cols-[52px_1fr_auto] lg:gap-3 lg:py-[11px] lg:pr-5";
  const upcoming = players === undefined;
  return (
    <li className="border-b border-ink/8 last:border-b-0">
      {upcoming ? (
        // A scheduled tappa has nothing to report yet, so the row is just a
        // date and a name, tighter than a played one.
        <Link
          href={`/events/${event.id}`}
          className="row-link grid grid-cols-[40px_1fr] items-center gap-2.5 py-1.5 pr-4 pl-3 text-ink/60 lg:grid-cols-[44px_1fr] lg:gap-3 lg:py-2 lg:pr-5"
        >
          <DateTile iso={event.played_at} ghost compact />
          <div className="truncate text-[13px] font-bold leading-[1.2] lg:text-[14px]">
            {tappaTitle(event.name)}
          </div>
        </Link>
      ) : (
        <Link href={`/events/${event.id}`} className={`row-link ${grid}`}>
          <DateTile iso={event.played_at} />
          <div className="min-w-0">
            <div className="text-[14px] font-bold leading-[1.2] lg:text-[15px]">
              {tappaTitle(event.name)}
            </div>
            <div className="mt-px text-[12px] text-ink/50">
              {players} giocatori
            </div>
          </div>
          <span aria-hidden className="text-[16px] text-ink/50">
            →
          </span>
        </Link>
      )}
    </li>
  );
}

export default async function Home() {
  const [entries, eventsRaw, season] = await Promise.all([
    getLeaderboard(),
    getEvents(),
    getActiveSeason(),
  ]);

  // A scheduled event stays "upcoming" until its results are imported, even
  // once its date has passed.
  const time = (e: EventSummary) => new Date(e.played_at).getTime();
  const played = eventsRaw.filter(isCompleted).sort((a, b) => time(b) - time(a));
  const upcoming = eventsRaw.filter((e) => !isCompleted(e)).sort((a, b) => time(a) - time(b));
  const playerCounts = await Promise.all(
    played.map((e) => getEvent(e.id).then((d) => d?.standings.length ?? 0)),
  );

  const year = eventsRaw[0]
    ? eventYear(eventsRaw[0].played_at)
    : new Date().getFullYear();
  const [first, second, third] = entries;
  const rest = entries.slice(3, 8);

  return (
    <main className={PAGE}>
      <TopBar
        className="lg:mb-9"
        left={<Brand year={year} />}
        right={season && <Chip rotate={-4}>{season.name}</Chip>}
      />

      <div className="lg:grid lg:grid-cols-[1fr_1.1fr] lg:items-start lg:gap-x-12">
        <div className="lg:flex lg:flex-col lg:gap-y-10">
          <section>
            <h1 className="mt-[26px] mb-3.5 text-[44px] font-extrabold leading-[0.95] tracking-[-0.04em] lg:mt-0 lg:mb-[22px] lg:text-[84px] lg:leading-[0.92] lg:tracking-[-0.045em]">
              Lega Pauper
              <br />
              <span className="text-accent">Milano</span>
            </h1>
            <div className="mb-7 flex items-center gap-6 lg:mb-0 lg:gap-8">
              <Stat value={entries.length} label="Giocatori" />
              <div className="h-9 w-px bg-ink/15 lg:h-11" />
              <Stat value={played.length} suffix={`/${eventsRaw.length}`} label="Tappe" />
            </div>
          </section>

          <TappeSection
            className="mt-8 hidden lg:mt-0 lg:block"
            played={played}
            upcoming={upcoming}
            playerCounts={playerCounts}
          />
        </div>

        <section className="mt-8 lg:mt-0 lg:flex lg:flex-col lg:gap-6">
          {first && (
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] items-end gap-2 text-center lg:gap-3">
              {second ? <PodiumSide entry={second} /> : <div />}
              <PodiumCenter entry={first} />
              {third ? <PodiumSide entry={third} /> : <div />}
            </div>
          )}

          <div>
            <div className="card mt-3 lg:mt-0">
              {rest.length === 0 ? (
                <EmptyRow>Nessun altro giocatore in classifica.</EmptyRow>
              ) : (
                <ul>
                  {rest.map((entry, i) => (
                    <RankRow
                      key={entry.player_id}
                      href={`/players/${entry.player_id}`}
                      rank={i + 4}
                      name={entry.display_name}
                      sub={tappeLabel(entry.events_played)}
                      points={entry.total_points}
                      desktopPadding="lg:py-[13px]"
                    />
                  ))}
                </ul>
              )}
            </div>
            <DashedLink href="/leaderboard">Classifica completa →</DashedLink>
          </div>
        </section>

        <TappeSection
          className="mt-8 lg:hidden"
          played={played}
          upcoming={upcoming}
          playerCounts={playerCounts}
        />
      </div>
    </main>
  );
}
