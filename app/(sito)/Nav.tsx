"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/leaderboard", label: "classifica" },
  { href: "/rules", label: "regole" },
];

export function Nav() {
  const path = usePathname();
  return (
    // On a phone the menu takes its own row, with the deck button at the far right.
    <nav aria-label="Sezioni" className="flex w-full items-center gap-1 lg:w-auto lg:gap-3">
      {LINKS.map((l) => {
        const active = path === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className="rg-nav rg-display inline-flex min-h-11 items-center px-2.5 text-[18px] lg:text-[19px]"
          >
            {l.label}
          </Link>
        );
      })}
      <Link
        href="/mazzo"
        aria-current={path === "/mazzo" ? "page" : undefined}
        className="rg-pill rg-display rg-strong ml-auto inline-flex min-h-11 items-center px-4 text-[18px] lg:ml-1 lg:px-5 lg:text-[19px]"
      >
        il mio mazzo
      </Link>
    </nav>
  );
}
