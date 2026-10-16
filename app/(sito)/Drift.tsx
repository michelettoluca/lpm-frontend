import type { ComponentType, CSSProperties } from "react";

/** A trophy: a cup with two handles on a stepped foot, in a 100 square. */
export const CUP_PATH =
  "M24 8H76V34C76 52 65 63 50 63C35 63 24 52 24 34ZM24 14H10V24C10 36 17 44 27 46L26 39C20 37 17 31 17 24V21H24ZM76 14H90V24C90 36 83 44 73 46L74 39C80 37 83 31 83 24V21H76ZM45 62H55V76H45ZM33 76H67C69 76 70 77 70 79V84H30V79C30 77 31 76 33 76ZM26 86H74V93H26Z";

/** The trophy, drawn in the current colour. Square. */
export const Cup = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
    <path fill="currentColor" d={CUP_PATH} />
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

export type Scattered = {
  key: string;
  /** The centre, as a share of the box's width and height. */
  x: number;
  y: number;
  /** Width in px at full size. */
  size: number;
  /** Degrees. */
  rotate: number;
  /** The big ones a touch paler, so they read as further back. */
  opacity: number;
  /** How far it drifts and sways, and on what clock (Drift's animation). */
  dx: number;
  dy: number;
  dr: number;
  duration: number;
  delay: number;
};

/**
 * Icons scattered as a watermark: one per cell of a loose grid, shaken well
 * inside it so no row or column shows, a few cells left empty, mostly small
 * with the odd big one. The same seed scatters the same way every time. The
 * site's panels (Drift, below) and the tappa's images share it.
 */
export function scatter(cols: number, rows: number, seed: number): Scattered[] {
  const rnd = random(seed);
  const between = (a: number, b: number) => a + rnd() * (b - a);
  const sign = () => (rnd() < 0.5 ? -1 : 1);

  const items: Scattered[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (rnd() < 0.2) continue;
      const size = 26 + rnd() ** 2.2 * 130;
      items.push({
        key: `${r}-${c}`,
        x: (c + between(0.1, 0.9)) / cols,
        y: (r + between(0.1, 0.9)) / rows,
        size,
        rotate: between(-24, 24),
        dx: sign() * between(3, 8),
        dy: sign() * between(3, 8),
        dr: between(1.5, 4),
        duration: between(22, 38),
        delay: -between(0, 38),
        opacity: size > 90 ? 0.7 : 1,
      });
    }
  }
  return items;
}

/**
 * The scattered icon behind a panel, each drifting and swaying slowly on its
 * own clock. Panels are their own layer, so it stays behind the text.
 */
export function Drift({
  icon: Icon,
  cols,
  rows,
  seed,
  feature = false,
}: {
  icon: ComponentType<{ className?: string }>;
  cols: number;
  rows: number;
  seed: number;
  /** One big one too, right of the middle, drifting slowest, over the scatter. */
  feature?: boolean;
}) {
  const items = scatter(cols, rows, seed);
  if (feature) {
    items.push({ key: "feature", x: 0.64, y: 0.56, size: 300, rotate: -6, opacity: 0.85, dx: 4, dy: -3, dr: 1.5, duration: 44, delay: -12 });
  }
  return (
    <div aria-hidden="true" className="rg-drift rg-watermark">
      {items.map((it) => (
        <span
          key={it.key}
          className="rg-drift-item"
          style={
            {
              left: `${it.x * 100}%`,
              top: `${it.y * 100}%`,
              "--s": it.size.toFixed(0),
              "--r": `${it.rotate.toFixed(1)}deg`,
              "--dx": `${it.dx.toFixed(1)}px`,
              "--dy": `${it.dy.toFixed(1)}px`,
              "--dr": `${it.dr.toFixed(1)}deg`,
              animationDuration: `${it.duration.toFixed(1)}s`,
              animationDelay: `${it.delay.toFixed(1)}s`,
              opacity: it.opacity,
            } as CSSProperties
          }
        >
          <Icon className="block h-auto w-full" />
        </span>
      ))}
    </div>
  );
}
