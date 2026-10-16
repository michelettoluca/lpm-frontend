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
import { Easter } from "../../Easter";
import { Drift } from "../../Drift";
import { paroleFor } from "../../parole";
import type { TeamLogo } from "@/app/lib/api";
import { SITE, shareMeta } from "@/app/lib/share";


export async function generateMetadata(props: PageProps<"/giocatori/[id]">) {
  const { id } = await props.params;
  const p = await getPlayerData(id);
  if (!p) return shareMeta(`Giocatore · ${SITE}`, SITE, `/giocatori/${id}`, true);
  // Their season in a line, for a shared link: where they stand and how they've played.
  const season = p.season ? `stagione ${p.season.name}` : SITE;
  const line = p.rank
    ? `${p.rank}° in classifica con ${p.points} punti · ${p.wins}-${p.losses}-${p.draws} · ${season}`
    : `${season}: nessuna tappa giocata finora`;
  return shareMeta(`${p.name} · ${SITE}`, line, `/giocatori/${id}`, true);
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

/** How much taller than wide a logo's box is. */
function tallness(logo: TeamLogo) {
  const [, , w, h] = logo.view_box.split(" ").map(Number);
  return w > 0 ? h / w : 1;
}

/** A team's logo as an icon to scatter, drawn in the current colour. */
function logoOf(logo: TeamLogo) {
  const Logo = ({ className }: { className?: string }) => (
    <svg viewBox={logo.view_box} aria-hidden="true" className={className}>
      <path fill="currentColor" fillRule="evenodd" d={logo.path} />
    </svg>
  );
  return Logo;
}

export default async function PlayerPage(props: PageProps<"/giocatori/[id]">) {
  const { id } = await props.params;
  const { stagione } = await props.searchParams;
  const [p, d] = await Promise.all([getPlayerData(id), getPlayerDecksData(id, stagione)]);
  if (!p) notFound();
  // Italian, or for Davide Rapacciuolo, Neapolitan (the easter eggs).
  const w = paroleFor(id);
  const deckSeason = d.choice.seasons.find((x) => x.id === d.choice.selected);
  const within = w.decks.within(deckSeason?.name);

  return (
    <div className="rg-stack" lang={w.lang}>
      {/* ---------------- hero ---------------- */}
      <section className="rg-panel">
        {/* The player's team, if any: its logo scattered thick behind the card, one big in the middle. */}
        {p.team && (
          <Drift
            icon={logoOf(p.team.logo)}
            // Every team's card laid out the same, its logo sized for its shape.
            cols={6}
            rows={4}
            seed={17}
            tall={tallness(p.team.logo)}
            feature
          />
        )}
        <Link href="/classifica" className="rg-textlink -ml-1 inline-flex min-h-11 items-center px-1 text-[15px]">
          {w.player.back}
        </Link>
        {p.season && <p className="rg-eyebrow mt-4">{w.player.season(p.season.name)}</p>}
        <h1 className="rg-display rg-tight mt-2 text-[48px] leading-[0.95] break-words sm:text-[72px] lg:text-[104px]">
          <Easter playerId={id}>
            {p.first}
            {p.last && (
              <>
                <br />
                {p.last}
              </>
            )}
          </Easter>
        </h1>

        <dl className="rg-hr mt-8 grid grid-cols-2 gap-x-6 gap-y-6 pt-6 sm:grid-cols-4 lg:mt-12 lg:pt-8">
          <Big label={w.player.rank}>
            <span className="relative inline-block px-1">
              <span className={`rg-display rg-tight tnum text-[52px] leading-none lg:text-[68px] ${p.rank === 1 ? "text-[var(--rg-o)]" : ""}`}>
                {p.rank ? `${p.rank}°` : "–"}
              </span>
              {p.rank === 1 && <MarkerCircle className="-inset-x-3 -inset-y-2 h-[calc(100%+16px)] w-[calc(100%+24px)]" />}
            </span>
          </Big>
          <Big label={w.player.points}>
            <span className="rg-display rg-tight tnum text-[52px] leading-none lg:text-[68px]">{p.points}</span>
          </Big>
          <Big label={w.player.record}>
            <span className="rg-display rg-tight tnum text-[36px] leading-none lg:text-[52px]">
              {p.wins}-{p.losses}-{p.draws}
            </span>
          </Big>
          <Big label={w.player.winPct}>
            <span className="rg-display rg-tight tnum text-[36px] leading-none lg:text-[52px]">{p.winPct}</span>
          </Big>
        </dl>
        <p className="rg-muted mt-6 text-[15px]">
          {w.player.played(p.tappe.length, p.playedSoFar)}
        </p>
      </section>

      {/* ---------------- tappe ---------------- */}
      <Section
        label={w.tappe.label}
        title={w.tappe.title}
        aside={
          <>
            {w.tappe.asideStart} <PixelStar size={12} className="inline-block text-[var(--rg-o)]" /> {w.tappe.asideEnd}
          </>
        }
      >
        {p.tappe.length === 0 ? (
          <p className="rg-display text-[24px]">{w.tappe.none}</p>
        ) : (
          <>
            <ColHeads className={TCOLS} cols={[{ label: w.tappe.cols[0] }, { label: w.tappe.cols[1] }, { label: w.tappe.cols[2], right: true }]} />
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
                          {w.tappe.place(t.rank)}
                          {t.prize && <PixelStar size={14} className="text-[var(--rg-o)]" label={w.tappe.prize} />}
                          {t.dropped && <span className="rg-badge ml-1">{w.tappe.dropped}</span>}
                        </span>
                        <span className="rg-muted flex min-w-0 flex-wrap items-center gap-x-2 text-[14px] tnum">
                          <span>
                            {d.day} {w.months[d.month - 1]} · {t.wins + t.byes}-{t.losses}-{t.draws}
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
            label={w.decks.label}
            title={w.decks.title}
            aside={w.decks.aside(p.first)}
          />
          <div className="mt-6">
            <SeasonPicker choice={d.choice} href={`/giocatori/${p.id}`} words={w.seasons} />
          </div>
          {d.decks.length === 0 ? (
            <p className="rg-muted mt-6 text-[16px]">{w.decks.none(within)}</p>
          ) : (
            <>
              <div className="mt-8">
                <ArchetypeBars
                  countLabel={w.decks.count}
                  words={w.bars}
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
                  <h3 className="rg-eyebrow">{w.decks.matrix}</h3>
                  <div className="mt-4">
                    <Matrix
                      rows={d.matrix.archetypes}
                      columns={d.league?.archetypes ?? d.matrix.archetypes}
                      cells={d.matrix.cells}
                      mirror={false}
                      label={w.decks.matrixLabel(p.name)}
                      words={w.matrix}
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
        label={w.faceOff.label}
        title={w.faceOff.title}
        aside={w.faceOff.aside(p.first)}
      >
        <FaceOff
          me={p.first}
          others={p.others}
          rows={p.headToHead.map((h) => ({ id: h.id, name: h.name, matches: h.matches, won: h.won, lost: h.lost, drawn: h.drawn }))}
          lang={w.lang}
        />
      </Section>
    </div>
  );
}
