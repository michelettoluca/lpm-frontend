import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { dateTile, getPlayerData } from "@/app/lib/site";
import { ColHeads, MarkerCircle, PixelStar, Section, plural } from "../../ui";
import { FaceOff } from "./FaceOff";

const num = (n: number, digits = 1) => n.toLocaleString("it-IT", { maximumFractionDigits: digits });
const pct = (part: number, whole: number) => (whole === 0 ? "–" : `${Math.round((part / whole) * 100)}%`);

export async function generateMetadata(props: PageProps<"/players/[id]">) {
  const { id } = await props.params;
  const p = await getPlayerData(id);
  return { title: p ? `${p.name} · Lega Pauper Milano` : "Giocatore · Lega Pauper Milano" };
}

function Fact({ value, label, sub }: { value: ReactNode; label: string; sub?: ReactNode }) {
  return (
    <div className="rg-hr pt-3">
      <dt className="rg-muted text-[14px] font-semibold">{label}</dt>
      <dd className="mt-1 flex flex-wrap items-baseline gap-x-2">
        <span className="rg-display rg-tight tnum text-[36px] leading-none lg:text-[44px]">{value}</span>
        {sub && <span className="rg-muted tnum text-[14px]">{sub}</span>}
      </dd>
    </div>
  );
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

export default async function PlayerPage(props: PageProps<"/players/[id]">) {
  const { id } = await props.params;
  const p = await getPlayerData(id);
  if (!p) notFound();

  const s = p.stats;
  const games = s ? s.gamesWon + s.gamesLost + s.gamesDrawn : 0;
  const rivals = s
    ? [
        s.nemesis && { label: "la bestia nera", r: s.nemesis, note: `ha battuto ${p.first} ${s.nemesis.count} volte` },
        s.victim && { label: "la vittima preferita", r: s.victim, note: `${p.first} l'ha battuto ${s.victim.count} volte` },
        s.mostFaced && { label: "il più affrontato", r: s.mostFaced, note: `${s.mostFaced.count} partite insieme` },
      ].filter((x) => !!x)
    : [];

  return (
    <div className="rg-stack">
      {/* ---------------- hero ---------------- */}
      <section className="rg-panel">
        <Link href={"/leaderboard"} className="rg-textlink -ml-1 inline-flex min-h-11 items-center px-1 text-[15px]">
          ← la classifica
        </Link>
        <p className="rg-eyebrow mt-4">giocatore{p.season ? ` · stagione ${p.season.name.toLowerCase()}` : ""}</p>
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
          <Big label="vinti · persi · patti">
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
                      href={`/events/${t.event.id}`}
                      className={`rg-row -mx-2 grid items-center px-2 py-3.5 ${TCOLS} ${t.dropped ? "rg-muted" : ""}`}
                    >
                      <span className="rg-display tnum text-[36px] leading-none">{t.number ?? "·"}</span>
                      <span className="min-w-0">
                        <span className="rg-display flex items-center gap-2 text-[20px] leading-tight">
                          {t.rank}° posto
                          {t.prize && <PixelStar size={14} className="text-[var(--rg-o)]" label="9 punti o più" />}
                          {t.dropped && <span className="rg-badge ml-1">scartata</span>}
                        </span>
                        <span className="rg-muted block text-[14px] tnum">
                          {d.day} {d.mon} · {t.wins + t.byes}-{t.losses}-{t.draws}
                          {t.byes > 0 ? ` (${plural(t.byes, "bye", "bye")})` : ""}
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

      {/* ---------------- numeri ---------------- */}
      {s && (
        <Section label="statistiche" title="i numeri" aside="Su tutte le tappe giocate, anche quelle scartate.">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-7 xl:grid-cols-4">
            <Fact label="miglior piazzamento" value={`${s.bestRank}°`} sub={s.bestRankTimes > 1 ? `×${s.bestRankTimes}` : undefined} />
            <Fact label="piazzamento medio" value={`${num(s.avgRank)}°`} />
            <Fact label="volte in top 8" value={s.topCut} sub={`su ${s.events}`} />
            <Fact label="punti per tappa" value={num(s.avgPoints)} sub={`${s.totalPoints} in tutto`} />
            <Fact label="game vinti" value={pct(s.gamesWon, games)} sub={`${s.gamesWon}-${s.gamesLost}-${s.gamesDrawn}`} />
            <Fact label="vittorie 2-0" value={pct(s.cleanWins, s.matchWins)} sub={`${s.cleanWins} su ${s.matchWins}`} />
            <Fact label="serie migliore" value={s.longestStreak} sub="match di fila" />
            <Fact label="forza avversari" value={pct(s.avgOmw, 1)} sub={`${s.opponents} avversari`} />
          </dl>

          {rivals.length > 0 && (
            <div className="mt-12">
              <h3 className="rg-eyebrow">gli avversari</h3>
              <ul className="rg-hr-strong mt-2">
                {rivals.map(({ label, r, note }, i) => (
                  <li key={label} className={i ? "rg-hr" : ""}>
                    <Link href={`/players/${r.id}`} className="rg-row -mx-2 grid grid-cols-[1fr_auto] items-end gap-x-4 px-2 py-4">
                      <span className="min-w-0">
                        <span className="rg-muted block text-[14px] font-semibold">{label}</span>
                        <span className="rg-display mt-0.5 block text-[24px] leading-tight lg:text-[30px]">{r.name}</span>
                        <span className="rg-muted block text-[14px]">{note}</span>
                      </span>
                      <span className="text-right">
                        <span className="rg-display rg-strong tnum block text-[24px] leading-none">{r.record}</span>
                        <span className="rg-muted block text-[12px] font-semibold">v-p-p</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>
      )}

      {/* ---------------- testa a testa ---------------- */}
      <Section
        label="confronto"
        title="testa a testa"
        aside={`Scegli un avversario e guarda come è andata contro ${p.first} in questa stagione. Match vinti, persi e patti.`}
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
