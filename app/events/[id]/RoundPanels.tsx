"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef, type KeyboardEvent, type ReactNode } from "react";
import type { Pairing, Standing } from "../../lib/api";
import { pad2, record } from "../../lib/format";
import { EmptyRow, PointsChip } from "../../components/ui";

const PRIZE_POINTS = 9;

type Props = {
  hero: ReactNode;
  standings: Standing[];
  pairings: Pairing[];
  rounds: number;
};

function parseTurno(raw: string | null, rounds: number): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= rounds ? n : null;
}

function RoundSelector({
  rounds,
  selected,
  onSelect,
}: {
  rounds: number;
  selected: number | null;
  onSelect: (r: number | null) => void;
}) {
  const options: (number | null)[] = [null, ...Array.from({ length: rounds }, (_, i) => i + 1)];
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = options.indexOf(selected);
    let next: number | undefined;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % options.length;
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + options.length) % options.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = options.length - 1;
    if (next === undefined) return;
    e.preventDefault();
    onSelect(options[next]);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label="Turno"
      onKeyDown={onKeyDown}
      style={{ "--rounds": rounds } as React.CSSProperties}
      className="mb-3.5 grid grid-cols-[1.6fr_repeat(var(--rounds),1fr)] gap-0.5 rounded-full border border-ink/10 bg-white p-1 lg:mb-0 lg:grid-cols-[auto_repeat(var(--rounds),72px)]"
    >
      {options.map((opt, i) => {
        const active = opt === selected;
        return (
          <button
            key={opt ?? "finale"}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onSelect(opt)}
            className={`tn rounded-full py-2 text-center text-[12px] transition-colors lg:py-[9px] lg:text-[13px] ${
              opt === null ? "lg:px-[22px]" : ""
            } ${
              active
                ? "bg-accent font-extrabold text-white"
                : "font-bold text-ink/70 hover:bg-ink/4"
            }`}
          >
            {opt === null ? "Finale" : `R${opt}`}
          </button>
        );
      })}
    </div>
  );
}

function FinalePanel({ standings }: { standings: Standing[] }) {
  return (
    <div className="panel-in">
      <div className="lbl grid grid-cols-[44px_1fr_auto_auto] gap-2.5 px-4 pb-2 lg:grid-cols-[48px_1fr_auto_auto] lg:gap-3 lg:px-5">
        <span>#</span>
        <span>Classifica finale</span>
        <span className="text-accent">≥ {PRIZE_POINTS} pt · premi</span>
        <span className="min-w-[24px] text-right lg:min-w-[38px] lg:text-center">Pt</span>
      </div>
      <div className="card">
        {standings.length === 0 ? (
          <EmptyRow>Classifica non ancora disponibile.</EmptyRow>
        ) : (
          <ul>
            {standings.map((s) => {
              const prize = s.points >= PRIZE_POINTS;
              return (
                <li key={s.player_id} className="border-b border-ink/8 last:border-b-0">
                  <Link
                    href={`/players/${s.player_id}`}
                    className="row-link grid grid-cols-[44px_1fr_auto_auto] items-center gap-2.5 px-4 py-[11px] lg:grid-cols-[48px_1fr_auto_auto] lg:gap-3 lg:px-5 lg:py-3"
                  >
                    <span
                      className={`tn text-[20px] font-extrabold leading-none tracking-[-0.03em] lg:text-[22px] ${
                        prize ? "text-accent" : ""
                      }`}
                    >
                      {pad2(s.rank)}
                    </span>
                    <span className="truncate text-[14px] font-bold capitalize lg:text-[15px]">
                      {s.player_name}
                    </span>
                    <span className="tn text-[12px] text-ink/45 lg:mr-4 lg:text-[13px] lg:text-ink/55">
                      {record(s.wins, s.losses, s.draws)}
                    </span>
                    <PointsChip points={s.points} prize={prize} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function PairingName({
  id,
  name,
  rec,
  won,
}: {
  id: number | null;
  name: string;
  rec: string;
  won: boolean;
}) {
  const cls = `flex justify-between gap-2 text-[14px] font-bold ${won ? "text-ink" : "text-ink/45"}`;
  const label = id === null ? (
    <span className="capitalize">{name}</span>
  ) : (
    <Link href={`/players/${id}`} className="capitalize hover:text-accent">
      {name}
    </Link>
  );
  return (
    <div className={cls}>
      {label}
      <span className="tn text-[11px] font-semibold text-ink/45">{rec}</span>
    </div>
  );
}

function RoundPanel({ round, pairings }: { round: number; pairings: Pairing[] }) {
  const rows = pairings
    .filter((p) => p.round === round)
    .sort((a, b) => a.table - b.table);
  return (
    <div className="panel-in">
      <div className="lbl grid grid-cols-[32px_1fr_auto] gap-2.5 px-4 pb-2 lg:grid-cols-[48px_1fr_auto] lg:gap-3 lg:px-5">
        <span>Tav.</span>
        <span>Turno {round} · accoppiamenti</span>
        <span>Risultato</span>
      </div>
      <div className="card">
        {rows.length === 0 ? (
          <EmptyRow>Accoppiamenti non disponibili.</EmptyRow>
        ) : (
          <ul>
            {rows.map((p) => {
              const draw = p.wins_a === p.wins_b;
              const aWon = draw || p.wins_a > p.wins_b;
              const bWon = draw || p.wins_b > p.wins_a;
              return (
                <li key={p.table} className="border-b border-ink/8 last:border-b-0">
                  <div className="grid grid-cols-[32px_1fr_auto] items-center gap-2.5 px-4 py-2.5 lg:grid-cols-[48px_1fr_auto] lg:gap-3 lg:px-5 lg:py-3">
                    <span className="tn text-[18px] font-extrabold tracking-[-0.03em] text-accent">
                      {p.table}
                    </span>
                    <div className="flex min-w-0 flex-col gap-[3px]">
                      <PairingName id={p.player_a_id} name={p.player_a_name} rec={p.record_a} won={aWon} />
                      <PairingName
                        id={p.player_b_id}
                        name={p.player_b_name ?? "Bye"}
                        rec={p.record_b}
                        won={bWon}
                      />
                    </div>
                    <span className="tn min-w-[44px] rounded-xl bg-tint px-2.5 py-1.5 text-center text-[15px] font-extrabold leading-none text-accent">
                      {p.wins_a}-{p.wins_b}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function RoundPanels({ hero, standings, pairings, rounds }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasRounds = rounds > 0 && pairings.length > 0;
  const selected = hasRounds ? parseTurno(searchParams.get("turno"), rounds) : null;

  const onSelect = (r: number | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (r === null) params.delete("turno");
    else params.set("turno", String(r));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <>
      <div className="lg:mb-7 lg:flex lg:items-end lg:justify-between lg:gap-6">
        {hero}
        {hasRounds && (
          <RoundSelector rounds={rounds} selected={selected} onSelect={onSelect} />
        )}
      </div>
      {selected === null ? (
        <FinalePanel key="finale" standings={standings} />
      ) : (
        <RoundPanel key={selected} round={selected} pairings={pairings} />
      )}
    </>
  );
}
