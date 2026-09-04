import BackLink from "../components/BackLink";
import { Chip, NARROW, PAGE, TopBar } from "../components/ui";
import { getEvents, getLatestSeason, getLeaderboard } from "../lib/api";
import ClassificaList from "./ClassificaList";

export default async function LeaderboardPage() {
  const [entries, events, season] = await Promise.all([
    getLeaderboard(),
    getEvents(),
    getLatestSeason(),
  ]);

  return (
    <main className={PAGE}>
      <div className={NARROW}>
        <TopBar
          className="lg:mb-7"
          left={<BackLink href="/" label="Home" />}
          right={season && <Chip rotate={-4}>{season.name}</Chip>}
        />
        <ClassificaList
          entries={entries}
          meta={`${entries.length} giocatori · ${events.length} tappe`}
        />
      </div>
    </main>
  );
}
