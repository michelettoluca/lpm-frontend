import { ArrowLink, Comune } from "./ui";

export default function NotFound() {
  return (
    <section className="rg-panel grid items-center gap-6 lg:grid-cols-[auto_1fr] lg:gap-16">
      <Comune pose="lost" className="h-[130px] w-[130px] lg:h-[200px] lg:w-[200px]" />
      <div>
        <p className="rg-eyebrow">errore 404</p>
        <h1 className="rg-display rg-tight mt-2 max-w-[16ch] text-[44px] leading-[0.98] lg:text-[80px]">
          questa pagina è finita nel cimitero.
        </h1>
        <p className="rg-muted mt-5 text-[16px] leading-relaxed">
          Abbiamo cercato in tutto il mazzo, anche nella sideboard. Niente. Forse il link è vecchio, forse il giocatore
          non esiste ancora.
        </p>
        <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-6">
          <ArrowLink href="/" className="text-[20px]">
            torna alla home
          </ArrowLink>
          <ArrowLink href={"/leaderboard"} className="text-[20px]">
            cerca in classifica
          </ArrowLink>
        </div>
      </div>
    </section>
  );
}
