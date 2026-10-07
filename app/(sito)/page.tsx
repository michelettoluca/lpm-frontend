import Link from "next/link";
import type { ReactNode } from "react";
import { COUNTED_EVENTS, dateTile, getHomeData } from "@/app/lib/site";
import { ArrowLink, ColHeads, Comune, MarkerCircle, PixelStar, Section, plural, sameRomeDay, weekday } from "./ui";

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div>
      <dt className="rg-muted text-[14px] leading-snug font-semibold">{label}</dt>
      <dd className="mt-1 flex items-baseline gap-1.5">
        <span className="rg-display rg-tight tnum text-[40px] leading-none lg:text-[52px]">{value}</span>
        {sub && <span className="rg-muted tnum text-[14px]">{sub}</span>}
      </dd>
    </div>
  );
}

const ROWS = "grid-cols-[2.4rem_1fr_2.6rem_2.8rem] gap-2 sm:grid-cols-[3rem_1fr_4.5rem_4.5rem] sm:gap-3";

export default async function Home() {
  const { season, leaderboard, played, upcoming, totalEvents } = await getHomeData();
  const counted = season?.counted_events ?? COUNTED_EVENTS;
  const avg = played.length ? Math.round(played.reduce((s, t) => s + t.players, 0) / played.length) : 0;
  const [first] = leaderboard;
  // Second to eighth share one list: only the leader stands out.
  const chasers = leaderboard.slice(1, 8);

  return (
    <div className="rg-stack">
      {/* ---------------- hero ---------------- */}
      <section className="rg-panel">
        <p className="rg-eyebrow">{season ? `stagione ${season.name.toLowerCase()}` : "la lega del giovedì"}</p>
        <div className="mt-4 flex items-end justify-between gap-4">
          <h1 className="rg-display rg-tight max-w-[12ch] text-[46px] leading-[0.95] sm:text-[72px] lg:text-[112px]">
            lega pauper milano
          </h1>
          <Comune pose="run" className="h-[76px] w-[76px] shrink-0 sm:h-[110px] sm:w-[110px] lg:h-[150px] lg:w-[150px]" />
        </div>
        <p className="rg-muted mt-4 text-[16px] leading-relaxed lg:text-[18px]">
          Tornei di Magic: The Gathering in formato Pauper, ogni giovedì sera alla Casa dei Giochi. Solo carte
          comuni, giocatori un po&apos; meno.
        </p>
        <dl className="rg-hr mt-8 grid grid-cols-2 gap-x-6 gap-y-6 pt-6 sm:grid-cols-4 lg:mt-12 lg:pt-8">
          <Stat label="giocatori in classifica" value={leaderboard.length} />
          <Stat label="tappe giocate" value={played.length} sub={`su ${totalEvents}`} />
          <Stat label="in media al tavolo" value={avg} sub="giocatori" />
          <Stat label="tappe che contano" value={counted} sub="le migliori" />
        </dl>
      </section>

      {/* ---------------- podium ---------------- */}
      {first && (
        <Section
          label="classifica"
          title="chi comanda"
          aside={<>La classifica dopo {plural(played.length, "tappa", "tappe")}.</>}
        >
          <Link
            href={`/players/${first.player_id}`}
            className="rg-row group -mx-2 grid grid-cols-[auto_1fr_auto] items-end gap-x-4 px-2 py-2"
          >
            <span className="rg-display tnum text-[88px] leading-[0.78] text-[var(--rg-o)] lg:text-[128px]">1</span>
            <span className="min-w-0 pb-0.5">
              <span className="rg-eyebrow block">primo, per ora</span>
              <span className="relative mt-3 inline-block px-1">
                <span className="rg-display block text-[26px] leading-[1.05] sm:text-[32px] lg:text-[48px]">{first.display_name}</span>
                <MarkerCircle className="-top-3 -left-3 h-[calc(100%+24px)] w-[calc(100%+26px)]" />
              </span>
              <span className="rg-muted mt-2 block text-[14px] tnum">{plural(first.events_played, "tappa", "tappe")}</span>
            </span>
            <span className="pb-0.5 text-right">
              <span className="rg-display tnum block text-[36px] leading-none lg:text-[52px]">{first.total_points}</span>
              <span className="rg-muted block text-[13px] font-semibold">punti</span>
            </span>
          </Link>

          <ColHeads
            className={`${ROWS} mt-6`}
            cols={[{ label: "pos." }, { label: "nome" }, { label: "tappe", right: true }, { label: "punti", right: true }]}
          />
          <ol>
            {chasers.map((e, i) => (
              <li key={e.player_id} className={i ? "rg-hr" : ""}>
                <Link href={`/players/${e.player_id}`} className={`rg-row -mx-2 grid min-h-13 items-center px-2 ${ROWS}`}>
                  <span className="rg-muted tnum text-[16px] font-semibold">{i + 2}</span>
                  <span className="rg-display truncate text-[19px]">{e.display_name}</span>
                  <span className="rg-muted tnum text-right text-[15px]">{e.events_played}</span>
                  <span className="rg-display rg-strong tnum text-right text-[19px]">{e.total_points}</span>
                </Link>
              </li>
            ))}
          </ol>
          <ArrowLink href="/leaderboard" className="rg-hr-strong mt-1 w-full pt-2 text-[20px]">
            tutti e {leaderboard.length}
          </ArrowLink>
        </Section>
      )}

      {/* ---------------- tappe ---------------- */}
      <Section
        label="calendario"
        title="le tappe"
        aside={
          <>
            {totalEvents} giovedì, quattro turni di svizzera a sera. Chi chiude con 9 punti o più si prende la stellina{" "}
            <PixelStar size={12} className="inline-block align-baseline text-[var(--rg-o)]" />.
          </>
        }
      >
        <div className="grid gap-10 xl:grid-cols-2 xl:gap-10">
          <div>
            <h3 className="rg-eyebrow">già giocate</h3>
            {played.length === 0 ? (
              <p className="rg-muted mt-4 text-[16px]">Nessuna ancora: il mazzo è tutto da pescare.</p>
            ) : (
              <ul className="rg-hr-strong mt-2">
                {played.map((t, i) => {
                  const d = dateTile(t.played_at);
                  const [w, ...rest] = t.podium;
                  return (
                    <li key={t.id} className={i ? "rg-hr" : ""}>
                      <Link href={`/events/${t.id}`} className="rg-row -mx-2 grid grid-cols-[3.4rem_1fr] gap-3 px-2 py-4">
                        <span className="rg-display tnum text-[44px] leading-[0.85]">{t.number ?? "·"}</span>
                        <span className="min-w-0">
                          <span className="rg-muted block text-[14px] font-semibold">
                            {weekday(t.played_at)} {d.day} {d.mon} · {t.players} giocatori
                          </span>
                          {w && (
                            <span className="rg-display mt-1 block text-[20px] leading-tight">vince {w.name}</span>
                          )}
                          {w && (
                            <span className="rg-muted mt-1 block text-[14px] tnum">
                              {w.points} punti
                              {rest.length > 0 && ` · poi ${rest.map((p) => `${p.name} (${p.points})`).join(", ")}`}
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div>
            <h3 className="rg-eyebrow">in arrivo</h3>
            {upcoming.length === 0 ? (
              <p className="rg-muted mt-4 text-[16px]">Calendario finito. Ci si vede alla top 8.</p>
            ) : (
              <ul className="rg-hr-strong mt-2">
                {upcoming.map((t, i) => {
                  const d = dateTile(t.played_at);
                  const tonight = sameRomeDay(t.played_at);
                  return (
                    <li key={t.id} className={i ? "rg-hr" : ""}>
                      <Link
                        href={`/events/${t.id}`}
                        className="rg-row -mx-2 grid min-h-16 grid-cols-[3.4rem_1fr_auto] items-center gap-3 px-2 py-3"
                      >
                        <span className="rg-display rg-outline tnum text-[40px] leading-none">{t.number ?? "·"}</span>
                        <span className="rg-display text-[20px] leading-tight">
                          {weekday(t.played_at)} {d.day} {d.mon}
                        </span>
                        {tonight && (
                          <span className="relative px-2">
                            <span className="rg-display rg-strong text-[19px] text-[var(--rg-link)]">stasera!</span>
                            <MarkerCircle className="-inset-x-2 -inset-y-2 h-[calc(100%+16px)] w-[calc(100%+16px)]" />
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </Section>

      {/* ---------------- closing: the call to declare ---------------- */}
      <section className="rg-panel rg-panel-o grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-12">
        <p className="rg-eyebrow">prima di sederti</p>
        <div>
          <p className="rg-display rg-tight text-[32px] leading-[1.08] lg:text-[48px]">
            Primo turno alle 20.30 in punto. Si pesca alle 20.31.
          </p>
          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-6">
            <Link href="/mazzo" className="rg-btn rg-btn-ink">
              cosa giochi stasera?
            </Link>
            <ArrowLink href="/rules" className="text-[20px]">
              il regolamento, in breve
            </ArrowLink>
          </div>
        </div>
      </section>
    </div>
  );
}
