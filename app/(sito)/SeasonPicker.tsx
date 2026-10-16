import Link from "next/link";
import type { SeasonChoice } from "@/app/lib/site";
import { ITALIANO, type Parole } from "./parole";

/** Links to the same page for each season, and for all of them together. */
export function SeasonPicker({
  choice,
  href,
  words: w = ITALIANO.seasons,
}: {
  choice: SeasonChoice;
  href: string;
  /** Its words, for a page in another language. */
  words?: Parole["seasons"];
}) {
  if (choice.seasons.length < 2) return null;
  const options = [
    ...choice.seasons.map((s) => ({ key: String(s.id), label: s.name, on: choice.selected === s.id })),
    { key: "tutte", label: w.all, on: choice.selected === "tutte" },
  ];
  return (
    <nav aria-label={w.label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <Link
          key={o.key}
          href={`${href}?stagione=${o.key}`}
          scroll={false}
          aria-current={o.on ? "page" : undefined}
          className={`rg-badge min-h-9 ${o.on ? "rg-badge-o" : ""}`}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
