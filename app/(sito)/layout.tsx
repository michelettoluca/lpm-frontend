import { Fraunces, Instrument_Sans } from "next/font/google";
import Link from "next/link";
import { Nav } from "./Nav";
import { Footer } from "./Footer";
import { WobbleDefs } from "./ui";
import "./sito.css";

/* Fraunces, variable: soft corners (SOFT 100), no wonky letters, light weights. */
const display = Fraunces({
  variable: "--font-rg-display",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

const text = Instrument_Sans({
  variable: "--font-rg-text",
  subsets: ["latin"],
  display: "swap",
});

/** The public site: header, page, and the closing panel. The admin has its own layout. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`lpm ${display.variable} ${text.variable}`}>
      <WobbleDefs />
      <a href="#rg-main" className="rg-skip">
        salta al contenuto
      </a>
      <header className="rg-wrap flex flex-wrap items-center justify-between gap-x-6 gap-y-1 pt-3 pb-3 lg:pt-6 lg:pb-5">
        <Link
          href="/"
          aria-label="LPM, Lega Pauper Milano: home"
          className="rg-display rg-strong flex min-h-11 items-center px-2.5 text-[24px] leading-none lg:px-0 lg:text-[26px]"
        >
          LPM
        </Link>
        <Nav />
      </header>

      <main id="rg-main" className="rg-wrap flex flex-1 flex-col">
        {children}
      </main>

      <Footer />
    </div>
  );
}
