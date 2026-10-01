import { brandMark } from "./lib/brandMark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return brandMark(size.width, { radius: 7 });
}
