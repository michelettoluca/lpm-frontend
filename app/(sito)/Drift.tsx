import type { ComponentType, CSSProperties } from "react";

/** A trophy, drawn in the current colour: a cup with two handles on a stepped foot. Square. */
export const Cup = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
    <path
      fill="currentColor"
      d="M24 8H76V34C76 52 65 63 50 63C35 63 24 52 24 34ZM24 14H10V24C10 36 17 44 27 46L26 39C20 37 17 31 17 24V21H24ZM76 14H90V24C90 36 83 44 73 46L74 39C80 37 83 31 83 24V21H76ZM45 62H55V76H45ZM33 76H67C69 76 70 77 70 79V84H30V79C30 77 31 76 33 76ZM26 86H74V93H26Z"
    />
  </svg>
);

/** A wall calendar, drawn in the current colour: two rings over a page of days. Square. */
export const Calendar = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M15 14H85C90 14 94 18 94 23V86C94 91 90 95 85 95H15C10 95 6 91 6 86V23C6 18 10 14 15 14ZM14 36V85C14 86 15 87 16 87H84C85 87 86 86 86 85V36ZM22 42H34V53H22ZM44 42H56V53H44ZM66 42H78V53H66ZM22 60H34V71H22ZM44 60H56V71H44ZM66 60H78V71H66ZM22 76H34V83H22ZM44 76H56V83H44Z"
    />
    <path fill="currentColor" d="M27 8C27 5.8 28.8 4 31 4C33.2 4 35 5.8 35 8V24C35 26.2 33.2 28 31 28C28.8 28 27 26.2 27 24ZM65 8C65 5.8 66.8 4 69 4C71.2 4 73 5.8 73 8V24C73 26.2 71.2 28 69 28C66.8 28 65 26.2 65 24Z" />
  </svg>
);

/** A small seeded random (mulberry32): the same panel scatters the same way on every render. */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * An icon scattered behind a panel as a watermark: one per cell of a loose
 * grid, shaken well inside it so no row or column shows, a few cells left
 * empty, mostly small with the odd big one. Each drifts and sways slowly on
 * its own clock. Panels are their own layer, so it stays behind the text.
 */
export function Drift({
  icon: Icon,
  cols,
  rows,
  seed,
}: {
  icon: ComponentType<{ className?: string }>;
  cols: number;
  rows: number;
  seed: number;
}) {
  const rnd = random(seed);
  const between = (a: number, b: number) => a + rnd() * (b - a);
  const sign = () => (rnd() < 0.5 ? -1 : 1);

  const items = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rnd() < 0.2) continue;
      const size = 26 + rnd() ** 2.2 * 130;
      const style = {
        left: `${((c + between(0.1, 0.9)) / cols) * 100}%`,
        top: `${((r + between(0.1, 0.9)) / rows) * 100}%`,
        "--s": size.toFixed(0),
        "--r": `${between(-24, 24).toFixed(1)}deg`,
        "--dx": `${(sign() * between(3, 8)).toFixed(1)}px`,
        "--dy": `${(sign() * between(3, 8)).toFixed(1)}px`,
        "--dr": `${between(1.5, 4).toFixed(1)}deg`,
        animationDuration: `${between(22, 38).toFixed(1)}s`,
        animationDelay: `${(-between(0, 38)).toFixed(1)}s`,
        // The big ones a touch paler, so they read as further back.
        opacity: size > 90 ? 0.7 : 1,
      } as CSSProperties;
      items.push(
        <span key={`${r}-${c}`} className="rg-drift-item" style={style}>
          <Icon className="block h-auto w-full" />
        </span>,
      );
    }
  }

  return (
    <div aria-hidden="true" className="rg-drift rg-watermark">
      {items}
    </div>
  );
}
