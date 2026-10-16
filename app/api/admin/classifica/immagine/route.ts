import { getLeaderboardData } from "@/app/lib/site";
import { cached, digest, remember } from "../../events/[id]/immagini/cache";
import { drawSeasonImage, type SeasonImage } from "../../events/[id]/immagini/draw";
import { SEASON_IMAGE } from "../../events/[id]/immagini/kinds";
import { requireAdmin } from "../../events/[id]/immagini/session";

/**
 * The season's standings for WhatsApp, as PNG: the active season's, the one
 * the site shows. Admins only.
 */
export async function GET(request: Request) {
  const refused = await requireAdmin(request);
  if (refused) return refused;
  const { season, leaderboard, tappe, verdict, playedEvents, totalEvents } = await getLeaderboardData();
  if (!season || tappe.length === 0) return new Response("Not found", { status: 404 });

  const last = tappe[tappe.length - 1];
  const data: SeasonImage = {
    season: season.name,
    rows: leaderboard.map((e, i) => ({
      rank: i + 1,
      id: e.player_id,
      name: e.display_name,
      points: e.total_points,
      played: e.events_played,
      verdict: verdict[e.player_id],
    })),
    last: last.number ?? playedEvents,
    played: playedEvents,
    total: totalEvents,
    counted: season.counted_events,
  };
  const key = `stagione:${season.id}:${digest(data)}`;
  let png = cached(key);
  if (!png) {
    const drawn = await drawSeasonImage(data);
    if (!drawn) return new Response("Not found", { status: 404 });
    png = Buffer.from(await drawn.arrayBuffer());
    remember(key, png);
  }
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="${SEASON_IMAGE.file}"`,
      // For the signed-in admin only: never a shared cache.
      "Cache-Control": "private, max-age=60",
    },
  });
}
