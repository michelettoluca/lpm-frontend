import type { Metadata } from "next";
import { Head } from "../ui";
import { DeclareFlow } from "./DeclareFlow";

export const metadata: Metadata = {
  title: "Cosa giochi? · Lega Pauper Milano",
  description: "Indica il mazzo che giochi alla tappa di oggi.",
  robots: { index: false, follow: false },
};

export default function MazzoPage() {
  return (
    // On a phone the flow fills the screen below the header; on desktop it
    // sits beside the steps and keeps its own height.
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_620px] lg:gap-4">
      <aside className="rg-panel hidden lg:block lg:self-start">
        <Head
          label="il mio mazzo"
          title="cosa giochi?"
          big
          aside="Da telefono, seduto al tavolo, prima di mescolare: numero del tavolo, il tuo nome, il tuo mazzo. Dieci secondi, poi si gioca."
        />
        <ol className="rg-hr mt-10 pt-1">
          {["il numero del tavolo", "chi sei dei due", "il mazzo che giochi", "conferma"].map((s, i) => (
            <li key={s} className={`grid grid-cols-[2rem_1fr] items-baseline py-3 ${i ? "rg-hr" : ""}`}>
              <span className="rg-muted tnum text-[14px] font-semibold">{i + 1}</span>
              <span className="rg-display text-[20px]">{s}</span>
            </li>
          ))}
        </ol>
      </aside>
      <div className="rg-panel rg-panel-tight mx-auto w-full max-w-[620px] flex-1 lg:flex-none lg:self-start">
        <DeclareFlow />
      </div>
    </div>
  );
}
