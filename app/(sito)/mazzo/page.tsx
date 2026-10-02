import type { Metadata } from "next";
import { DeclarePage } from "./DeclarePage";

export const metadata: Metadata = {
  title: "Cosa giochi? · Lega Pauper Milano",
  description: "Indica il mazzo che giochi alla tappa di oggi.",
  robots: { index: false, follow: false },
};

export default function MazzoPage() {
  return <DeclarePage />;
}
