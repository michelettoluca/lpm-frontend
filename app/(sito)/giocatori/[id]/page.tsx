import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { dateTile, getPlayerData, getPlayerDecksData } from "@/app/lib/site";
import { ArchetypeBars } from "../../ArchetypeBars";
import { Matrix } from "../../Matrix";
import { SeasonPicker } from "../../SeasonPicker";
import { ColHeads, Head, MarkerCircle, PixelStar, Section, plural } from "../../ui";
import { FaceOff } from "./FaceOff";
import { DeckTag } from "../../DeckTag";


export async function generateMetadata(props: PageProps<"/giocatori/[id]">) {
  const { id } = await props.params;
  const p = await getPlayerData(id);
  return { title: p ? `${p.name} · Lega Pauper Milano` : "Giocatore · Lega Pauper Milano" };
}

function Big({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="rg-muted text-[14px] font-semibold">{label}</dt>
      <dd className="mt-2">{children}</dd>
    </div>
  );
}

const TCOLS = "grid-cols-[3rem_1fr_auto] gap-3 sm:grid-cols-[4rem_1fr_auto]";

export default async function PlayerPage(props: PageProps<"/giocatori/[id]">) {
  const { id } = await props.params;
  const { stagione } = await props.searchParams;
  const [p, d] = await Promise.all([getPlayerData(id), getPlayerDecksData(id, stagione)]);
  if (!p) notFound();
  const deckSeason = d.choice.seasons.find((x) => x.id === d.choice.selected);
  const within = deckSeason ? `nella ${deckSeason.name}` : "in tutte le stagioni";


  return (
    <div className="rg-stack">
      {/* ---------------- hero ---------------- */}
      <section className="rg-panel">
        <Link href="/classifica" className="rg-textlink -ml-1 inline-flex min-h-11 items-center px-1 text-[15px]">
          ← la classifica
        </Link>
        {p.season && <p className="rg-eyebrow mt-4">stagione {p.season.name.toLowerCase()}</p>}
        <h1 className="rg-display rg-tight mt-2 text-[48px] leading-[0.95] break-words sm:text-[72px] lg:text-[104px]">
          {p.first}
          {p.last && (
            <>
              <br />
              {p.last}
            </>
          )}
        </h1>

        <dl className="rg-hr mt-8 grid grid-cols-2 gap-x-6 gap-y-6 pt-6 sm:grid-cols-4 lg:mt-12 lg:pt-8">
          <Big label="posizione">
            <span className="relative inline-block px-1">
              <span className={`rg-display rg-tight tnum text-[52px] leading-none lg:text-[68px] ${p.rank === 1 ? "text-[var(--rg-o)]" : ""}`}>
                {p.rank ? `${p.rank}°` : "–"}
              </span>
              {p.rank === 1 && <MarkerCircle className="-inset-x-3 -inset-y-2 h-[calc(100%+16px)] w-[calc(100%+24px)]" />}
            </span>
          </Big>
          <Big label="punti">
            <span className="rg-display rg-tight tnum text-[52px] leading-none lg:text-[68px]">{p.points}</span>
          </Big>
          <Big label="vinte · perse · patte">
            <span className="rg-display rg-tight tnum text-[36px] leading-none lg:text-[52px]">
              {p.wins}-{p.losses}-{p.draws}
            </span>
          </Big>
          <Big label="match vinti">
            <span className="rg-display rg-tight tnum text-[36px] leading-none lg:text-[52px]">{p.winPct}</span>
          </Big>
        </dl>
        <p className="rg-muted mt-6 text-[15px]">
          {plural(p.tappe.length, "tappa giocata", "tappe giocate")} su {p.playedSoFar} finora.
        </p>
      </section>

      {/* ---------------- tappe ---------------- */}
      <Section
        label="storico"
        title="le sue tappe"
        aside={
          <>
            Le più recenti in alto. <PixelStar size={12} className="inline-block text-[var(--rg-o)]" /> = 9 punti o più. Le
            tappe scartate (oltre le migliori 8) sono in grigio: non contano per la classifica.
          </>
        }
      >
        {p.tappe.length === 0 ? (
          <p className="rg-display text-[24px]">Ancora nessuna tappa. Il primo giovedì è sempre il più bello.</p>
        ) : (
          <>
            <ColHeads className={TCOLS} cols={[{ label: "tappa" }, { label: "piazzamento" }, { label: "punti", right: true }]} />
            <ul>
              {p.tappe.map((t, i) => {
                const d = dateTile(t.event.played_at);
                return (
                  <li key={t.event.id} className={i ? "rg-hr" : ""}>
                    <Link
                      href={`/tappe/${t.event.id}`}
                      className={`rg-row -mx-2 grid items-center px-2 py-3.5 ${TCOLS} ${t.dropped ? "rg-muted" : ""}`}
                    >
                      <span className="rg-display tnum text-[36px] leading-none">{t.number ?? "·"}</span>
                      <span className="min-w-0">
                        <span className="rg-display flex items-center gap-2 text-[20px] leading-tight">
                          {t.rank}° posto
                          {t.prize && <PixelStar size={14} className="text-[var(--rg-o)]" label="9 punti o più" />}
                          {t.dropped && <span className="rg-badge ml-1">scartata</span>}
                        </span>
                        <span className="rg-muted flex min-w-0 flex-wrap items-center gap-x-2 text-[14px] tnum">
                          <span>
                            {d.day} {d.mon} · {t.wins + t.byes}-{t.losses}-{t.draws}
                            {t.byes > 0 ? ` (${plural(t.byes, "bye", "bye")})` : ""}
                          </span>
                          {t.deck && <DeckTag deck={t.deck} />}
                        </span>
                      </span>
                      <span className={`rg-display rg-strong tnum text-right text-[24px] ${t.dropped ? "line-through decoration-1" : ""}`}>
                        {t.points}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Section>

      {/* ---------------- mazzi ---------------- */}
      {d.anyDeck && (
        <section className="rg-panel">
          <Head
            label="mazzi"
            title="cosa ha giocato"
            aside={`Gli archetipi giocati da ${p.first} ${within}.`}
          />
          <div className="mt-6">
            <SeasonPicker choice={d.choice} href={`/giocatori/${p.id}`} />
          </div>
          {d.decks.length === 0 ? (
            <p className="rg-muted mt-6 text-[16px]">Nessun mazzo conosciuto {within}.</p>
          ) : (
            <>
              <div className="mt-8">
                <ArchetypeBars
                  countLabel="tappe"
                  rows={d.decks.map((x) => ({
                    id: x.id,
                    name: x.name,
                    colors: x.colors,
                    count: x.decks,
                    said: `${x.name}: ${plural(x.decks, "tappa", "tappe")}`,
                  }))}
                />
              </div>

              {d.matrix && d.matrix.cells.length > 0 && (
                <div className="mt-12">
                  <h3 className="rg-eyebrow">matrice dei risultati</h3>
                  <div className="mt-4">
                    <Matrix
                      rows={d.matrix.archetypes}
                      columns={d.league?.archetypes ?? d.matrix.archetypes}
                      cells={d.matrix.cells}
                      mirror={false}
                      label={`Matchup di ${p.name}`}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* ---------------- testa a testa ---------------- */}
      <Section
        label="confronto"
        title="testa a testa"
        aside={`Scegli un avversario e guarda come è andata contro ${p.first} in questa stagione. Partite vinte, perse e patte.`}
      >
        <FaceOff
          me={p.first}
          others={p.others}
          rows={p.headToHead.map((h) => ({ id: h.id, name: h.name, matches: h.matches, won: h.won, lost: h.lost, drawn: h.drawn }))}
        />
      </Section>
    </div>
  );
}
