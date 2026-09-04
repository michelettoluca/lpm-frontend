import Link from "next/link";
import type { ReactNode } from "react";
import { dateTile, pad2 } from "../lib/format";

/** Page container: mobile ≤640, centered ≤560 on tablets, 1280 frame on desktop. */
export const PAGE =
  "mx-auto w-full max-w-[560px] px-5 pt-4 pb-8 lg:max-w-[1280px] lg:px-12 lg:pt-7 lg:pb-14";

/** Narrow desktop content column (Classifica, Tappa). */
export const NARROW = "lg:mx-auto lg:max-w-[760px]";

export function Chip({
  children,
  rotate = -4,
}: {
  children: ReactNode;
  rotate?: number;
}) {
  return (
    <span
      className="inline-block rounded-full bg-accent px-3 py-1.5 text-[11px] font-bold leading-none text-white shadow-[0_6px_14px_rgba(255,45,26,0.14)]"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {children}
    </span>
  );
}

export function TopBar({
  left,
  right,
  className = "",
}: {
  left: ReactNode;
  right: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      {left}
      {right}
    </div>
  );
}

export function Brand({ year }: { year: number }) {
  return (
    <span className="text-[12px] font-extrabold tracking-[0.04em] lg:text-[14px]">
      LPM ✦ {year}
    </span>
  );
}

/** Accent-edged card: 1.5px accent frame with soft glow around a white body. */
export function AccentCard({
  children,
  outer,
  inner,
}: {
  children: ReactNode;
  outer: string;
  inner: string;
}) {
  return (
    <div
      className={`bg-accent p-[1.5px] shadow-[0_10px_26px_rgba(255,45,26,0.14)] ${outer}`}
    >
      <div className={`bg-white ${inner}`}>{children}</div>
    </div>
  );
}

export function DateTile({ iso, ghost = false }: { iso: string; ghost?: boolean }) {
  const { day, mon } = dateTile(iso);
  return (
    <span
      className={`grid h-11 w-12 place-items-center rounded-xl text-center leading-none lg:h-[46px] lg:w-[52px] ${
        ghost
          ? "border-[1.5px] border-dashed border-ink/35"
          : "bg-tint text-accent"
      }`}
    >
      <span>
        <span className="tn block text-[16px] font-extrabold lg:text-[17px]">
          {day}
        </span>
        <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.08em]">
          {mon}
        </span>
      </span>
    </span>
  );
}

export function PointsChip({
  points,
  prize,
}: {
  points: number;
  prize: boolean;
}) {
  return (
    <span
      className={`tn inline-block min-w-[34px] rounded-[10px] px-1.5 py-1 text-center text-[15px] font-extrabold leading-none lg:min-w-[38px] ${
        prize ? "bg-tint" : "bg-transparent"
      }`}
    >
      {points}
    </span>
  );
}

export function SectionHead({
  title,
  aside,
  className = "",
}: {
  title: string;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-baseline justify-between ${className}`}>
      <span className="text-[16px] font-extrabold uppercase tracking-[0.08em]">
        {title}
      </span>
      {aside !== undefined && (
        <span className="text-[12px] text-ink/50">{aside}</span>
      )}
    </div>
  );
}

export function DashedLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="mt-2.5 block rounded-[18px] border-[1.5px] border-dashed border-ink/25 bg-white p-3 text-center text-[14px] font-bold text-ink/70 transition-colors hover:border-ink/45"
    >
      {children}
    </Link>
  );
}

/** Season-ranking row: two-digit rank, name + tappe line, points with "pts". */
export function RankRow({
  href,
  rank,
  name,
  sub,
  points,
  className = "",
  desktopPadding = "lg:py-3",
}: {
  href: string;
  rank: number;
  name: string;
  sub: string;
  points: number;
  className?: string;
  desktopPadding?: string;
}) {
  return (
    <li className={`border-b border-ink/8 last:border-b-0 ${className}`}>
      <Link
        href={href}
        className={`row-link grid grid-cols-[40px_1fr_auto] items-center gap-2 px-4 py-[11px] lg:grid-cols-[48px_1fr_auto] lg:gap-3 lg:px-5 ${desktopPadding}`}
      >
        <span className="tn text-[22px] font-extrabold leading-none tracking-[-0.03em] text-accent lg:text-[24px]">
          {pad2(rank)}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-bold capitalize leading-[1.2] lg:text-[16px]">
            {name}
          </div>
          <div className="mt-px text-[12px] text-ink/50">{sub}</div>
        </div>
        <span className="tn text-[16px] font-extrabold lg:text-[18px]">
          {points}
          <span className="ml-[3px] text-[11px] font-semibold text-ink/50">
            pts
          </span>
        </span>
      </Link>
    </li>
  );
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 py-6 text-center text-[13px] text-ink/50">
      {children}
    </div>
  );
}
