import { Figtree } from "next/font/google";
import { deckCollectionOpen } from "@/app/lib/api";
import { HomeLink, Nav } from "./Nav";
import { Footer } from "./Footer";
import { WobbleDefs } from "./ui";
import "./sito.css";

/* Figtree for the text: friendly and modern, easy to read small. */
const text = Figtree({
  variable: "--font-rg-text",
  subsets: ["latin"],
  display: "swap",
});

/** The public site: header, page, and the closing panel. The admin has its own layout. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const decks = await deckCollectionOpen();
  return (
    <div className={`lpm ${text.variable}`}>
      <WobbleDefs />
      <a href="#rg-main" className="rg-skip">
        salta al contenuto
      </a>
      {/* Its own layer above the page: the phone menu opens just under it, its backdrop behind the header's links. */}
      <header className="rg-wrap relative z-30 flex items-center justify-between gap-x-6 pt-3 pb-3 lg:pt-6 lg:pb-5">
        <HomeLink />
        <Nav decks={decks} />
      </header>

      <main id="rg-main" className="rg-wrap flex flex-1 flex-col">
        {children}
      </main>

      <Footer />
    </div>
  );
}
