import { brandMark } from "./lib/brandMark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Square corners: iOS rounds the home-screen icon itself.
export default function AppleIcon() {
  return brandMark(size.width, { radius: 0 });
}
