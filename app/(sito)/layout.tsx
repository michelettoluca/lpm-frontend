import { Fraunces, Instrument_Sans } from "next/font/google";
import { HomeLink, Nav } from "./Nav";
import { Footer } from "./Footer";
import { FontSwitch } from "./FontSwitch";
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
      {/* Its own layer above the page: the phone menu opens just under it, its backdrop behind the header's links. */}
      <header className="rg-wrap relative z-30 flex items-center justify-between gap-x-6 pt-3 pb-3 lg:pt-6 lg:pb-5">
        <HomeLink />
        <Nav />
      </header>

      <main id="rg-main" className="rg-wrap flex flex-1 flex-col">
        {children}
      </main>

      <Footer />
      {/* Inlined at build time: production drops the switch and its code. */}
      {process.env.NODE_ENV === "development" && <FontSwitch />}
    </div>
  );
}
