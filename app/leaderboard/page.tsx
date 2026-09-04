import BackLink from "../components/BackLink";
import { Chip, NARROW, PAGE, TopBar } from "../components/ui";
import { getEvents, getLeaderboard } from "../lib/api";
import { eventYear, isPlayed } from "../lib/format";
import ClassificaList from "./ClassificaList";

export default async function LeaderboardPage() {
  const [entries, events] = await Promise.all([getLeaderboard(), getEvents()]);
  const played = events.filter((e) => isPlayed(e.played_at)).length;
  const year = events[0]
    ? eventYear(events[0].played_at)
    : new Date().getFullYear();

  return (
    <main className={PAGE}>
      <div className={NARROW}>
        <TopBar
          className="lg:mb-7"
          left={<BackLink href="/" label="Home" />}
          right={<Chip rotate={-4}>summer {year}</Chip>}
        />
        <ClassificaList
          entries={entries}
          meta={`${entries.length} giocatori · ${played} di ${events.length} tappe`}
        />
      </div>
    </main>
  );
}
