import { notFound } from "next/navigation";
import { Suspense } from "react";
import BackLink from "../../components/BackLink";
import { Chip, NARROW, PAGE, TopBar } from "../../components/ui";
import { getEvent, getPairings } from "../../lib/api";
import {
  eventStatus,
  formatDateMeta,
  pad2,
  tappaNumber,
  tappaSubtitle,
} from "../../lib/format";
import RoundPanels from "./RoundPanels";

export default async function EventDetailPage(
  props: PageProps<"/events/[id]">,
) {
  const { id } = await props.params;
  const [data, pairings] = await Promise.all([getEvent(id), getPairings(id)]);
  if (!data) notFound();

  const { event, standings } = data;
  const n = tappaNumber(event.name);
  const status = eventStatus(event.played_at);
  const roundsPlayed = standings.reduce(
    (max, s) => Math.max(max, s.wins + s.losses + s.draws + s.byes),
    0,
  );
  const rounds = Math.max(
    roundsPlayed,
    pairings.reduce((max, p) => Math.max(max, p.round), 0),
  );
  const meta = [
    formatDateMeta(event.played_at),
    rounds > 0 ? `Svizzera ${rounds} turni` : null,
    `${standings.length} giocatori`,
  ]
    .filter(Boolean)
    .join(" · ");

  const hero = (
    <div>
      <div className="mt-[22px] mb-1.5 flex items-end gap-3 lg:mt-0 lg:mb-0 lg:gap-[18px]">
        <span className="tn text-[96px] font-extrabold leading-[0.82] tracking-[-0.06em] text-accent lg:text-[150px] lg:leading-[0.8]">
          {n === null ? "—" : pad2(n)}
        </span>
        <div className="min-w-0 pb-1.5 lg:pb-2">
          <div className="text-[20px] font-extrabold leading-[1.05] tracking-[-0.02em] lg:text-[34px] lg:leading-[1.02] lg:tracking-[-0.03em]">
            {tappaSubtitle(event.name)}
          </div>
          <div className="mt-2.5 hidden text-[14px] text-ink/60 lg:block">
            {meta}
          </div>
        </div>
      </div>
      <div className="mb-[18px] text-[13px] text-ink/60 lg:hidden">{meta}</div>
    </div>
  );

  return (
    <main className={PAGE}>
      <div className={NARROW}>
        <TopBar
          className="lg:mb-7"
          left={<BackLink href="/" label="Tappe" />}
          right={
            <Chip rotate={3}>
              {status === "conclusa" ? "conclusa ✦" : status}
            </Chip>
          }
        />
        <Suspense fallback={hero}>
          <RoundPanels
            hero={hero}
            standings={standings}
            pairings={pairings}
            rounds={rounds}
          />
        </Suspense>
      </div>
    </main>
  );
}
