"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Crown } from "@/app/lib/emblem";
import { MarkerUnderline } from "./ui";

const LINKS = [
  { href: "/classifica", label: "classifica" },
  { href: "/statistiche", label: "statistiche" },
  { href: "/regole", label: "regole" },
];

/** The emblem's crown in the league's red and the LPM wordmark, underlined like a nav link while you are on the home page. */
export function HomeLink() {
  const home = usePathname() === "/";
  return (
    <Link
      href="/"
      aria-label="LPM, Lega Pauper Milano: home"
      aria-current={home ? "page" : undefined}
      className="rg-display rg-strong relative flex min-h-11 items-center px-2.5 text-[24px] leading-none lg:px-0 lg:text-[26px]"
    >
      {/* The crown stands on the wordmark's baseline. */}
      <span className="flex items-baseline gap-2 lg:gap-2.5">
        <Crown className="h-[1.25em] w-auto text-[var(--rg-o)]" />
        LPM
      </span>
      {/* Under the wordmark alone, from the right: "LPM" is about 2.2em wide. */}
      <MarkerUnderline className="right-1.5 top-[calc(50%+0.75em)] h-[8px] w-[calc(2.2em+8px)] lg:-right-1" />
    </Link>
  );
}

/** Three strokes drawn by hand, turning into a cross while the menu is open. */
function MenuIcon() {
  return (
    <span aria-hidden="true" className="relative block h-6 w-6">
      <svg viewBox="0 0 24 24" className="rg-menu-icon rg-menu-icon-bars absolute inset-0">
        <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M4 6.6 C9 6 15 7.1 20 6.4" />
          <path d="M4 12.2 C9.5 11.6 14.5 12.7 20 12" />
          <path d="M4 17.8 C9 17.2 15 18.2 20 17.6" />
        </g>
      </svg>
      <svg viewBox="0 0 24 24" className="rg-menu-icon rg-menu-icon-cross absolute inset-0">
        <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M5.5 5.8 C10 10.2 14 14 18.4 18.3" />
          <path d="M18.2 5.6 C13.8 10 10 14.2 5.7 18.4" />
        </g>
      </svg>
    </span>
  );
}

/**
 * The sections and the deck button. On a computer the links sit in a row; on a
 * phone they fold into a menu that drops under the header over a blurred
 * backdrop, and only the deck button stays in sight beside the menu's.
 */
export function Nav() {
  const path = usePathname();
  // Open for the page it was opened on: going to another page closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === path;
  const close = () => setOpenOn(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenOn(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <nav aria-label="Sezioni" data-open={open} className="flex items-center gap-1 lg:gap-3">
      {LINKS.map((l) => {
        const active = path === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className="rg-nav rg-display hidden min-h-11 items-center px-2.5 text-[19px] lg:inline-flex"
          >
            {l.label}
            <MarkerUnderline className="left-2 top-[calc(50%+0.6em)] h-[7px] w-[calc(100%-16px)]" />
          </Link>
        );
      })}
      <Link
        href="/mazzo"
        aria-current={path === "/mazzo" ? "page" : undefined}
        className="rg-pill rg-display rg-strong inline-flex min-h-11 items-center px-4 text-[18px] lg:ml-1 lg:px-5 lg:text-[19px]"
      >
        il mio mazzo
      </Link>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="rg-menu"
        aria-label={open ? "Chiudi il menu" : "Apri il menu"}
        onClick={() => setOpenOn(open ? null : path)}
        className="rg-nav inline-flex h-11 w-11 items-center justify-center lg:hidden"
      >
        <MenuIcon />
      </button>

      {/* Always in the page, so it can fade and slide out as well as in; inert while closed. */}
      <div aria-hidden="true" onClick={close} className="rg-menu-backdrop backdrop-blur-[4px] lg:hidden" />
      <div
        id="rg-menu"
        inert={!open}
        className="rg-menu rg-panel absolute inset-x-[10px] top-full z-10 shadow-[0_18px_48px_rgb(0_0_0/0.18)] lg:hidden"
      >
        <ul>
          {LINKS.map((l, i) => {
            const active = path === l.href;
            return (
              <li key={l.href} className={i ? "rg-hr" : ""} style={{ "--i": i } as React.CSSProperties}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  onClick={close}
                  className="rg-nav rg-display relative flex min-h-14 items-center text-[28px]"
                >
                  <span className="relative">
                    {l.label}
                    {active && <MarkerUnderline className="left-0 top-[calc(50%+0.55em)] h-[8px] w-full" />}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
