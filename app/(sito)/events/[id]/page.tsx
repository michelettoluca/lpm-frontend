import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { PRIZE_POINTS, getEventData, type Standing } from "@/app/lib/site";
import { ArrowLink, ColHeads, Comune, Head, PixelStar, Section, plural, sameRomeDay, weekday } from "../../ui";

export async function generateMetadata(props: PageProps<"/events/[id]">) {
  const { id } = await props.params;
  const e = await getEventData(id);
  return { title: e ? `${e.title} · Lega Pauper Milano` : "Tappa · Lega Pauper Milano" };
}

const rec = (s: Standing) => `${s.wins + s.byes}-${s.losses}-${s.draws}`;

const COLS = "grid-cols-[2.2rem_1fr_3rem_2.6rem] gap-2 sm:grid-cols-[3rem_1fr_4.5rem_4rem]";

export default async function EventPage(props: PageProps<"/events/[id]">) {
  const { id } = await props.params;
  const e = await getEventData(id);
  if (!e) notFound();

  const [first, ...rest] = e.standings;
  const podium = rest.slice(0, 2);
  const others = rest.slice(2);
  const prizeCount = e.standings.filter((s) => s.prize).length;
  // Standings are sorted, so the rows with 9 points or more come first: draw a line after the last one.
  const lastPrizeId = prizeCount > 3 && prizeCount < e.standings.length ? e.standings[prizeCount - 1].player_id : null;
  const rounds = [...new Set(e.pairings.map((p) => p.round))].sort((a, b) => a - b);
  const tonight = sameRomeDay(e.event.played_at);

  return (
    <div className="rg-stack">
      {/* ---------------- hero ---------------- */}
      <section className="rg-panel">
        <Link href="/" className="rg-textlink -ml-1 inline-flex min-h-11 items-center px-1 text-[15px]">
          ← tutte le tappe
        </Link>
        <div className="mt-4 grid items-end gap-x-10 gap-y-4 sm:grid-cols-[auto_1fr]">
          <h1 className="rg-display rg-tight leading-[0.8]">
            <span className="rg-eyebrow block font-[family-name:var(--font-rg-text)] tracking-[0.08em]">tappa</span>
            <span className={`tnum mt-2 block text-[148px] lg:text-[220px] ${e.hasResults ? "" : "rg-outline"}`}>
              {e.number ?? "?"}
            </span>
          </h1>
          <div className="lg:pb-6">
            <p className="rg-display text-[28px] leading-tight lg:text-[40px]">
              {weekday(e.event.played_at)} {e.date}
            </p>
            {e.subtitle !== "Lega Pauper Milano" && e.subtitle !== e.title && <p className="rg-muted mt-1 text-[15px]">{e.subtitle}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
              <span className={`rg-badge ${tonight ? "rg-badge-o" : ""}`}>{tonight ? "stasera!" : e.status}</span>
              {e.hasResults && (
                <span className="rg-muted text-[15px] font-semibold tnum">
                  {plural(e.standings.length, "giocatore", "giocatori")} · {plural(e.rounds, "turno", "turni")} di svizzera
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {!e.hasResults ? (
        <section className="rg-panel grid items-center gap-6 sm:grid-cols-[auto_1fr] lg:gap-14">
          <Comune pose="sleep" className="h-[120px] w-[120px] lg:h-[180px] lg:w-[180px]" />
          <div>
            <Head label="risultati" title="Le carte sono ancora nel mazzo." />
            <p className="rg-muted mt-4 text-[16px] leading-relaxed">
              Primo turno alle 20.30 alla Casa dei Giochi, quattro turni di svizzera. La classifica della serata compare
              qui quando i risultati sono caricati.
            </p>
            <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-6">
              <Link href="/mazzo" className="rg-btn rg-btn-fill">
                cosa giochi stasera?
              </Link>
              <ArrowLink href="/rules" className="text-[20px]">
                come funziona la serata
              </ArrowLink>
            </div>
          </div>
        </section>
      ) : (
        <Section
          label="risultati"
          title="com'è finita"
          aside={
            <>
              Record in vinti-persi-patti, bye contati come vittorie. Con {PRIZE_POINTS} punti o più arriva la stellina{" "}
              <PixelStar size={12} className="inline-block text-[var(--rg-o)]" />: ci {prizeCount === 1 ? "è riuscito uno" : `sono riusciti in ${prizeCount}`}.
            </>
          }
        >
          <ol className="min-w-0">
            {first && (
              <li>
                <Link
                  href={`/players/${first.player_id}`}
                  className="rg-row -mx-2 grid grid-cols-[auto_1fr_auto] items-end gap-x-4 px-2 py-3"
                >
                  <span className="rg-display tnum text-[88px] leading-[0.78] text-[var(--rg-o)] lg:text-[112px]">1</span>
                  <span className="min-w-0 pb-0.5">
                    <span className="rg-eyebrow block">vince la serata</span>
                    <span className="rg-display mt-2 flex items-center gap-2 text-[26px] leading-[1.05] sm:text-[32px] lg:text-[44px]">
                      {first.player_name}
                      {first.prize && <PixelStar size={14} className="shrink-0 text-[var(--rg-o)]" label="9 punti o più" />}
                    </span>
                    <span className="rg-muted mt-1 block text-[14px] tnum">{rec(first)}</span>
                  </span>
                  <span className="pb-0.5 text-right">
                    <span className="rg-display tnum block text-[36px] leading-none lg:text-[48px]">{first.points}</span>
                    <span className="rg-muted block text-[13px] font-semibold">punti</span>
                  </span>
                </Link>
              </li>
            )}
            {podium.map((s) => (
              <li key={s.player_id} className="rg-hr mt-2">
                <Link
                  href={`/players/${s.player_id}`}
                  className="rg-row -mx-2 grid grid-cols-[2.2rem_1fr_auto] items-center gap-x-2 px-2 py-4 sm:grid-cols-[3rem_1fr_auto]"
                >
                  <span className="rg-display tnum text-[52px] leading-[0.85] lg:text-[60px]">{s.rank}</span>
                  <span className="min-w-0">
                    <span className="rg-display flex items-center gap-2 text-[22px] leading-[1.1] lg:text-[28px]">
                      {s.player_name}
                      {s.prize && <PixelStar size={13} className="shrink-0 text-[var(--rg-o)]" label="9 punti o più" />}
                    </span>
                    <span className="rg-muted mt-0.5 block text-[14px] tnum">{rec(s)}</span>
                  </span>
                  <span className="text-right">
                    <span className="rg-display tnum block text-[28px] leading-none lg:text-[34px]">{s.points}</span>
                    <span className="rg-muted block text-[13px] font-semibold">punti</span>
                  </span>
                </Link>
              </li>
            ))}
            <li className="mt-6">
              <ColHeads
                className={COLS}
                cols={[{ label: "pos." }, { label: "nome" }, { label: "v-p-p", right: true }, { label: "punti", right: true }]}
              />
              <ol>
                {others.map((s, i) => (
                  <Fragment key={s.player_id}>
                    <li className={i ? "rg-hr" : ""}>
                      <Link
                        href={`/players/${s.player_id}`}
                        className={`rg-row -mx-2 grid min-h-12 items-center px-2 ${COLS}`}
                      >
                        <span className="rg-muted tnum text-[15px] font-semibold">{s.rank}</span>
                        <span className="flex min-w-0 items-center gap-2 text-[16px] font-semibold">
                          <span className="truncate">{s.player_name}</span>
                          {s.prize && <PixelStar size={12} className="shrink-0 text-[var(--rg-o)]" label="9 punti o più" />}
                        </span>
                        <span className="rg-muted tnum text-right text-[14px]">{rec(s)}</span>
                        <span className="rg-display rg-strong tnum text-right text-[18px]">{s.points}</span>
                      </Link>
                    </li>
                    {s.player_id === lastPrizeId && (
                      <li className="flex items-center gap-3 py-3" role="separator" aria-label="Fine di chi ha 9 punti o più">
                        <span aria-hidden="true" className="h-[2px] flex-1 rounded-full bg-[var(--rg-o)]" />
                        <span aria-hidden="true" className="rg-badge rg-badge-o shrink-0">
                          ↑ 9 punti o più
                        </span>
                      </li>
                    )}
                  </Fragment>
                ))}
              </ol>
            </li>
          </ol>
        </Section>
      )}

      {rounds.length > 0 && (
        <section className="rg-panel">
          <Head label="abbinamenti" title="turno per turno" aside="Tocca un turno per vedere tavoli e risultati." />
          <div className="mt-6 grid gap-x-10 lg:grid-cols-2">
            {rounds.map((r) => (
              <details key={r} className="rg-hr">
                <summary className="rg-display flex min-h-14 cursor-pointer items-center justify-between text-[22px]">
                  turno {r}
                  <span aria-hidden="true" className="rg-muted text-[14px] font-[family-name:var(--font-rg-text)] font-semibold">
                    {e.pairings.filter((p) => p.round === r).length} tavoli
                  </span>
                </summary>
                <div className="pb-4">
                  <ColHeads
                    className="grid-cols-[2.4rem_1fr_auto] gap-2"
                    cols={[{ label: "tav." }, { label: "giocatori" }, { label: "esito", right: true }]}
                  />
                  <ul>
                    {e.pairings
                      .filter((p) => p.round === r)
                      .map((p, i) => (
                        <li key={`${r}-${p.table}`} className={`grid grid-cols-[2.4rem_1fr_auto] gap-2 py-2 text-[15px] tnum ${i ? "rg-hr" : ""}`}>
                          <span className="rg-muted">{p.table}</span>
                          <span>
                            {p.player_a_name} <span className="rg-muted">–</span> {p.player_b_name ?? <span className="rg-muted">bye</span>}
                          </span>
                          <span className="font-semibold">
                            {p.wins_a}-{p.wins_b}
                            {p.draws ? `-${p.draws}` : ""}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
