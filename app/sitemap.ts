import type { MetadataRoute } from "next";
import { getEvents, getLeaderboard } from "./lib/api";

const BASE_URL = "https://legapaupermilano.it";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [entries, events] = await Promise.all([getLeaderboard(), getEvents()]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/leaderboard`, changeFrequency: "daily", priority: 0.9 },
  ];

  const eventRoutes: MetadataRoute.Sitemap = events.map((event) => ({
    url: `${BASE_URL}/events/${event.id}`,
    lastModified: event.played_at,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const playerRoutes: MetadataRoute.Sitemap = entries.map((entry) => ({
    url: `${BASE_URL}/players/${entry.player_id}`,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...eventRoutes, ...playerRoutes];
}
