import { getLeaderboardData } from "@/app/lib/site";
import { Head, plural } from "../ui";
import { Standings } from "./Standings";

export const metadata = { title: "Classifica · Lega Pauper Milano" };

export default async function LeaderboardPage() {
  const { season, leaderboard, tappe, results, improvable, verdict, playedEvents, totalEvents } =
    await getLeaderboardData();
  const counted = season?.counted_events ?? 8;

  return (
    <div className="rg-panel grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-12">
      <Head
        as="h1"
        big
        label={season ? `stagione ${season.name.toLowerCase()}` : "stagione"}
        title="la classifica"
        className="lg:sticky lg:top-8 lg:self-start"
        aside={
          <>
            {plural(leaderboard.length, "giocatore", "giocatori")} dopo {plural(playedEvents, "tappa", "tappe")} su{" "}
            {totalEvents}. Contano le migliori {counted}: chi ne gioca di più può scartare le serate no. La linea
            rossa segna la zona top 8.
          </>
        }
      />
      <Standings
        rows={leaderboard.map((e, i) => ({
          rank: i + 1,
          id: e.player_id,
          name: e.display_name,
          points: e.total_points,
          played: e.events_played,
          results: results[e.player_id] ?? [],
          improvable: improvable[e.player_id] ?? [],
          verdict: verdict[e.player_id],
        }))}
        tappe={tappe}
      />
    </div>
  );
}
