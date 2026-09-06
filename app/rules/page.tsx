import type { Metadata } from "next";
import type { ReactNode } from "react";
import BackLink from "../components/BackLink";
import { Chip, NARROW, PAGE, SectionHead, TopBar } from "../components/ui";
import { getActiveSeason } from "../lib/api";

export const metadata: Metadata = {
  title: "Regolamento · Lega Pauper Milano",
  description:
    "Come funziona la Lega Pauper Milano: cadenza delle tappe, sede, orari, preiscrizioni e regolamento completo.",
};

const DISCORD = "https://discord.gg/s7DAXvBh9u";

const SPECS: Array<[string, ReactNode]> = [
  ["Cadenza", "Una tappa a settimana, festività escluse"],
  ["Periodo", "Da settembre a novembre 2026"],
  ["Giorno", "Giovedì sera, primo turno alle 20.30"],
  ["Formato", "4 turni di svizzera"],
  [
    "Sede",
    <>
      Casa dei Giochi
      <span className="block text-ink/50">Via Sant&apos;Uguzzone 8, 20126 Milano</span>
    </>,
  ],
  ["Tappe", "10 in calendario, le migliori 8 contano per la classifica"],
  ["Chiusura", "Top 8 il 12 novembre"],
];

function SpecRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[92px_1fr] items-baseline gap-3 border-b border-ink/8 px-4 py-3 last:border-b-0 lg:grid-cols-[120px_1fr] lg:gap-4 lg:px-5 lg:py-[14px]">
      <span className="lbl">{label}</span>
      <span className="text-[14px] leading-[1.45] font-bold lg:text-[15px]">
        {children}
      </span>
    </li>
  );
}

function Prose({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 text-[14px] leading-[1.6] text-ink/70 lg:text-[15px]">
      {children}
    </p>
  );
}

export default async function RulesPage() {
  const season = await getActiveSeason();

  return (
    <main className={PAGE}>
      <div className={NARROW}>
        <TopBar
          className="lg:mb-7"
          left={<BackLink href="/" label="Home" />}
          right={season && <Chip rotate={-3}>{season.name}</Chip>}
        />

        <h1 className="mt-[26px] mb-2 text-[40px] font-extrabold leading-[0.95] tracking-[-0.04em] lg:mt-0 lg:mb-2.5 lg:text-[64px] lg:leading-[0.92] lg:tracking-[-0.045em]">
          Regolamento
          <br />
          <span className="text-accent">e informazioni</span>
        </h1>
        <p className="mb-7 text-[13px] text-ink/60 lg:mb-9 lg:text-[14px]">
          Tutto quello che serve sapere per giocare la lega.
        </p>

        <section>
          <SectionHead className="mb-2.5 lg:mb-3" title="La stagione" />
          <div className="card">
            <ul>
              {SPECS.map(([label, value]) => (
                <SpecRow key={label} label={label}>
                  {value}
                </SpecRow>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-9 lg:mt-11">
          <SectionHead className="mb-2.5 lg:mb-3" title="Orari e iscrizioni" />
          <Prose>
            Per riuscire a completare la tappa in serata, l&apos;orario d&apos;inizio del primo
            turno è tassativo: <strong className="font-bold text-ink">20.30</strong>. Chi si
            preiscrive è automaticamente nei pairings del primo turno, gli altri hanno comunque
            la possibilità di iscriversi arrivando per tempo.
          </Prose>
          <Prose>
            Allo stesso modo, segnalare per tempo l&apos;impossibilità di partecipare o un
            piccolo ritardo ci dà una mano a evitare i bye per no show.
          </Prose>
        </section>

        <section className="mt-9 lg:mt-11">
          <SectionHead className="mb-2.5 lg:mb-3" title="Preiscrizioni" />
          <Prose>
            Per le preiscrizioni e per tutte le discussioni sul pauperismo, sulle attività della
            Lega Pauper Milano e in generale di Lega Pauper Italia c&apos;è un canale WhatsApp
            dedicato. Per richiedere l&apos;accesso basta mandare un messaggio alla pagina della
            lega.
          </Prose>
        </section>

        <section className="mt-9 lg:mt-11">
          <SectionHead className="mb-2.5 lg:mb-3" title="Regolamento completo" />
          <Prose>
            Chiunque partecipi alla lega accetta il regolamento, che trovi sul server Discord di
            Lega Pauper Italia.
          </Prose>
          <a
            href={DISCORD}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-xl bg-accent px-4 py-3 text-[14px] font-bold text-white transition-opacity hover:opacity-90 lg:text-[15px]"
          >
            Leggi il regolamento su Discord →
          </a>
        </section>

        <p className="mt-10 text-[16px] font-extrabold tracking-[-0.02em] lg:mt-12 lg:text-[18px]">
          Ci vediamo in Uguzzone!
        </p>
      </div>
    </main>
  );
}
