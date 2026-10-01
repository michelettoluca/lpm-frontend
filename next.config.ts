import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Keep the development badge out of the admin sidebar's account menu.
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
