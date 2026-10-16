import type { Metadata } from "next";
import { DeclarePage } from "./DeclarePage";
import { SITE, shareMeta } from "@/app/lib/share";

export const metadata: Metadata = {
  ...shareMeta(`Cosa giochi? · ${SITE}`, "Indica il mazzo che giochi alla tappa di oggi.", "/mazzo"),
  robots: { index: false, follow: false },
};

export default function MazzoPage() {
  return <DeclarePage />;
}
