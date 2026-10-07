"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MarkerUnderline } from "./ui";

const LINKS = [
  { href: "/leaderboard", label: "classifica" },
  { href: "/statistiche", label: "statistiche" },
  { href: "/rules", label: "regole" },
];

/** The LPM wordmark, underlined like a nav link while you are on the home page. */
export function HomeLink() {
  const home = usePathname() === "/";
  return (
    <Link
      href="/"
      aria-label="LPM, Lega Pauper Milano: home"
      aria-current={home ? "page" : undefined}
      className="rg-display rg-strong relative flex min-h-11 items-center px-2.5 text-[24px] leading-none lg:px-0 lg:text-[26px]"
    >
      LPM
      <MarkerUnderline className="left-1.5 top-[calc(50%+0.55em)] h-[8px] w-[calc(100%-12px)] lg:-left-1 lg:w-[calc(100%+8px)]" />
    </Link>
  );
}

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
            <MarkerUnderline className="left-2 top-[calc(50%+0.6em)] h-[7px] w-[calc(100%-16px)]" />
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
