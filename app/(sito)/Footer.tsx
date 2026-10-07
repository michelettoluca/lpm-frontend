"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RULES } from "@/app/lib/rules";
import { Comune } from "./ui";

/**
 * The closing panel under every page, except the deck flow: at the table the
 * phone shows only what is needed to declare.
 */
export function Footer() {
  if (usePathname() === "/mazzo") return <div className="pb-6 lg:pb-10" />;
  return (
    <footer className="rg-wrap mt-2.5 pb-6 lg:pb-10 lg:mt-4">
      <div className="rg-panel rg-panel-dark grid items-end gap-6 lg:grid-cols-[1fr_auto]">
        <div>
          <p className="rg-eyebrow">ogni giovedì</p>
          <p className="rg-display rg-tight mt-3 text-[38px] leading-[1] lg:text-[64px]">
            ci vediamo giovedì,
            <br />
            alle 20.30.
          </p>
          <p className="rg-muted mt-5 text-[15px] leading-relaxed">
            Casa dei Giochi, via Sant&apos;Uguzzone 8, Milano. Porta il mazzo, le bustine protettive e la voglia di
            mescolare.
          </p>
          <p className="mt-4 flex flex-wrap gap-x-6">
            <a className="rg-textlink inline-flex min-h-11 items-center" href={RULES.discord} target="_blank" rel="noopener noreferrer">
              discord della lega
            </a>
            <Link className="rg-textlink inline-flex min-h-11 items-center" href="/regole">
              come funziona
            </Link>
          </p>
        </div>
        <Comune pose="wave" className="-mt-4 h-[96px] w-[96px] justify-self-end lg:mt-0 lg:h-[132px] lg:w-[132px]" />
      </div>
    </footer>
  );
}
