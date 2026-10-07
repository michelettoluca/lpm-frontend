import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Keep the development badge out of the admin sidebar's account menu.
  devIndicators: { position: "bottom-right" },
  // The public pages moved to Italian addresses; the English ones keep working.
  async redirects() {
    return [
      { source: "/leaderboard", destination: "/classifica", permanent: true },
      { source: "/rules", destination: "/regole", permanent: true },
      { source: "/events/:id", destination: "/tappe/:id", permanent: true },
      { source: "/players/:id", destination: "/giocatori/:id", permanent: true },
    ];
  },
};

export default nextConfig;
