"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RULES } from "@/app/lib/rules";
import { ThemeToggle } from "./ThemeToggle";
import { Comune } from "./ui";
import { paroleAt } from "./parole";

/**
 * The closing panel under every page, except the deck flow: at the table the
 * phone shows only what is needed to declare, and the privacy link.
 */
export function Footer() {
  const path = usePathname();
  if (path === "/mazzo")
    return (
      <div className="rg-wrap pb-6 lg:pb-10">
        <Link className="rg-textlink rg-muted inline-flex min-h-11 items-center text-[14px]" href="/privacy">
          privacy
        </Link>
      </div>
    );
  const { lang, footer: w } = paroleAt(path);
  return (
    <footer lang={lang} className="rg-wrap mt-2.5 pb-6 lg:pb-10 lg:mt-4">
      <div className="rg-panel rg-panel-dark grid items-end gap-6 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="rg-eyebrow">{w.eyebrow}</p>
          <p className="rg-display rg-tight mt-3 text-[38px] leading-[1] lg:text-[64px]">
            {w.when[0]}
            <br />
            {w.when[1]}
          </p>
          <p className="rg-muted mt-5 text-[15px] leading-relaxed">
            {w.where}
          </p>
          <p className="mt-4 flex flex-wrap gap-x-6">
            <a className="rg-textlink inline-flex min-h-11 items-center" href={RULES.discord} target="_blank" rel="noopener noreferrer">
              {w.discord}
            </a>
            <Link className="rg-textlink inline-flex min-h-11 items-center" href="/regole">
              {w.rules}
            </Link>
            <Link className="rg-textlink inline-flex min-h-11 items-center" href="/privacy">
              {w.privacy}
            </Link>
          </p>
        </div>
        <Comune pose="wave" className="-mt-4 h-[96px] w-[96px] justify-self-end lg:mt-0 lg:h-[132px] lg:w-[132px]" />
      </div>
      <div className="mt-2 flex justify-end">
        <ThemeToggle light={w.light} dark={w.dark} />
      </div>
    </footer>
  );
}
