import BackLink from "../components/BackLink";
import { Chip, NARROW, PAGE, TopBar } from "../components/ui";
import { getActiveSeason, getEvents, getLeaderboard } from "../lib/api";
import { isCompleted } from "../lib/format";
import ClassificaList from "./ClassificaList";

export default async function LeaderboardPage() {
  const [entries, events, season] = await Promise.all([
    getLeaderboard(),
    getEvents(),
    getActiveSeason(),
  ]);
  const played = events.filter(isCompleted).length;

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
          meta={`${entries.length} giocatori · ${played} di ${events.length} tappe`}
        />
      </div>
    </main>
  );
}
