import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { COUNTED_EVENTS, dateTile, getHomeData } from "@/app/lib/site";
import { Emblem } from "@/app/lib/emblem";
import { Calendar, Cup, Drift } from "./Drift";
import { ArrowLink, ColHeads, MarkerCircle, MarkerUnderline, PixelStar, Section, plural, sameRomeDay, weekday } from "./ui";

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

/**
 * The season as a thin line, a tappa to a step, each step a faint dot: red
 * up to a knob on the last one played, and a bar across it where the tappe
 * that count end.
 */
function SeasonTrack({ played, total, counted }: { played: number; total: number; counted: number }) {
  return (
    <div
      role="img"
      aria-label={`${played} tappe giocate su ${total}`}
      className="rg-season mt-6"
      style={{ "--n": total, "--p": played } as CSSProperties}
    >
      <span className="rg-season-fill" />
      {Array.from({ length: total - 1 }, (_, i) => i + 1)
        .filter((i) => i !== counted)
        .map((i) => (
          <span
            key={i}
            className={`rg-season-dot ${i < played ? "rg-season-dot-done" : ""}`}
            style={{ "--i": i } as CSSProperties}
          />
        ))}
      {counted < total && <span className="rg-season-cut" style={{ "--k": counted } as CSSProperties} />}
      <span className="rg-season-knob" />
    </div>
  );
}

const ROWS = "grid-cols-[2.4rem_1fr_2.6rem_2.8rem] gap-2 sm:grid-cols-[3rem_1fr_4.5rem_4.5rem] sm:gap-3";

export default async function Home() {
  const { season, leaderboard, played, upcoming, totalEvents } = await getHomeData();
  const counted = season?.counted_events ?? COUNTED_EVENTS;
  const avg = played.length ? Math.round(played.reduce((s, t) => s + t.players, 0) / played.length) : 0;
  const [first] = leaderboard;
  const [next] = upcoming;
  // Second to eighth share one list: only the leader stands out.
  const chasers = leaderboard.slice(1, 8);

  return (
    <div className="rg-stack">
      {/* ---------------- hero ---------------- */}
      {/* The emblem as a watermark, scattered and drifting behind the text. */}
      <section className="rg-panel">
        <Drift icon={Emblem} cols={6} rows={3} seed={7} />
        <p className="rg-eyebrow">{season ? `stagione ${season.name.toLowerCase()}` : "la lega del giovedì"}</p>
        <h1 className="rg-display rg-tight mt-4 max-w-[12ch] text-[46px] leading-[0.95] sm:text-[72px] lg:text-[112px]">
          Lega Pauper Milano
        </h1>
        <p className="rg-muted mt-4 text-[16px] leading-relaxed lg:text-[18px]">
          Tornei di Magic: The Gathering in formato Pauper, ogni giovedì sera alla Casa dei Giochi. Solo carte
          comuni, giocatori un po&apos; meno.
        </p>
        {/* Where the season stands comes first, the rest is a footnote to it. */}
        <div className="rg-hr mt-8 grid gap-8 pt-6 lg:mt-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:items-end lg:gap-16 lg:pt-8">
          <div>
            <p className="rg-muted text-[14px] font-semibold">tappe giocate</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="rg-display rg-tight tnum text-[72px] leading-[0.85] lg:text-[112px]">{played.length}</span>
              <span className="rg-display rg-tight rg-muted tnum text-[32px] leading-none lg:text-[48px]">/{totalEvents}</span>
            </p>
            {totalEvents > 0 && <SeasonTrack played={played.length} total={totalEvents} counted={counted} />}
            <p className="rg-muted mt-5 text-[14px] leading-snug">
              {next ? (
                <>
                  prossima:{" "}
                  <Link href={`/tappe/${next.id}`} className="rg-textlink font-semibold">
                    {sameRomeDay(next.played_at) ? "stasera" : `${weekday(next.played_at)} ${dateTile(next.played_at).day} ${dateTile(next.played_at).mon}`}
                  </Link>
                </>
              ) : (
                "calendario finito, si va alla top 8"
              )}
            </p>
          </div>
          <div>
            <dl className="grid grid-cols-2 gap-6">
              <Stat label="in classifica" value={leaderboard.length} sub="giocatori" />
              <Stat label="in media al tavolo" value={avg} sub="giocatori" />
            </dl>
            <p className="rg-muted mt-4 text-[14px] leading-snug">
              Per la classifica contano le migliori {counted} tappe di ognuno.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------- podium ---------------- */}
      {first && (
        <Section
          label="classifica"
          title="Chi comanda"
          aside={<>La classifica dopo {plural(played.length, "tappa", "tappe")}.</>}
          backdrop={<Drift icon={Cup} cols={4} rows={5} seed={23} />}
        >
          <Link
            href={`/giocatori/${first.player_id}`}
            className="rg-row group -mx-2 grid grid-cols-[auto_1fr_auto] items-end gap-x-4 px-2 py-2"
          >
            <span className="rg-display tnum text-[88px] leading-[0.78] text-[var(--rg-o)] lg:text-[128px]">1</span>
            <span className="min-w-0 pb-0.5">
              <span className="rg-eyebrow block">primo, per ora</span>
              <span className="relative mt-3 inline-block">
                <span className="rg-display block text-[26px] leading-[1.05] sm:text-[32px] lg:text-[48px]">{first.display_name}</span>
                <MarkerUnderline always width={3} className="-left-1 top-full mt-0.5 h-[9px] w-[calc(100%+8px)]" />
              </span>
              <span className="rg-muted mt-3.5 block text-[14px] tnum">{plural(first.events_played, "tappa", "tappe")}</span>
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
                <Link href={`/giocatori/${e.player_id}`} className={`rg-row -mx-2 grid min-h-13 items-center px-2 ${ROWS}`}>
                  <span className="rg-muted tnum text-[16px] font-semibold">{i + 2}</span>
                  <span className="rg-display truncate text-[19px]">{e.display_name}</span>
                  <span className="rg-muted tnum text-right text-[15px]">{e.events_played}</span>
                  <span className="rg-display rg-strong tnum text-right text-[19px]">{e.total_points}</span>
                </Link>
              </li>
            ))}
          </ol>
          <ArrowLink href="/classifica" className="rg-hr-strong mt-1 w-full pt-2 text-[20px]">
            tutti e {leaderboard.length}
          </ArrowLink>
        </Section>
      )}

      {/* ---------------- tappe ---------------- */}
      <Section
        backdrop={<Drift icon={Calendar} cols={5} rows={4} seed={41} />}
        label="calendario"
        title="Le tappe"
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
                      <Link href={`/tappe/${t.id}`} className="rg-row -mx-2 grid grid-cols-[3.4rem_1fr] gap-3 px-2 py-4">
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
                        href={`/tappe/${t.id}`}
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
            <ArrowLink href="/regole" className="text-[20px]">
              il regolamento, in breve
            </ArrowLink>
          </div>
        </div>
      </section>
    </div>
  );
}
