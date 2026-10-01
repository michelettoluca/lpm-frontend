import Link from "next/link";
import type { ReactNode } from "react";

/* ------------------------------------------------------------------ */
/* Hand-drawn wobble: three noise filters, swapped by CSS ("boil").    */
/* ------------------------------------------------------------------ */

export function WobbleDefs() {
  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: "absolute", width: 0, height: 0 }}>
      <defs>
        {[1, 2, 3].map((seed) => (
          <filter key={seed} id={`rg-w${seed}`} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed={seed * 7} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        ))}
      </defs>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* The one marker loop left: around the leader and "stasera!".        */
/* ------------------------------------------------------------------ */

const CIRCLE =
  "M38 14 C86 2 168 4 190 28 C208 50 168 74 104 76 C44 78 6 66 8 42 C10 22 52 10 120 7";

/** A felt-tip loop drawn around its parent (which must be `relative`). */
export function MarkerCircle({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 80"
      preserveAspectRatio="none"
      className={`rg-doodle pointer-events-none absolute ${className}`}
    >
      <path d={CIRCLE} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const UNDERLINE = "M4 6.5 C34 4.2 70 8.4 112 5.6 C146 3.6 176 5.2 196 7.2";

/** A felt-tip stroke under a nav link; CSS shows it on hover and on the current page. */
export function MarkerUnderline({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 12"
      preserveAspectRatio="none"
      className={`rg-doodle rg-mark pointer-events-none absolute ${className}`}
    >
      <path d={UNDERLINE} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** A plain, drawn-with-a-ruler arrow pointing right. */
export function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`inline-block ${className}`}>
      <path d="M4 12 H19 M13 6 L19 12 L13 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Pixel bits: the star for 9 points or more.                         */
/* ------------------------------------------------------------------ */

function Pixels({ rows, size, className, label }: { rows: string[]; size: number; className?: string; label?: string }) {
  const w = rows[0].length;
  const h = rows.length;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={size}
      height={(size * h) / w}
      shapeRendering="crispEdges"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {rows.flatMap((row, y) =>
        [...row].map((c, x) => (c === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill="currentColor" /> : null)),
      )}
    </svg>
  );
}

const STAR = ["...#...", "..###..", "#######", ".#####.", "..###..", ".##.##.", "##...##"];

export function PixelStar({ size = 14, className = "", label }: { size?: number; className?: string; label?: string }) {
  return <Pixels rows={STAR} size={size} className={className} label={label} />;
}

/* ------------------------------------------------------------------ */
/* Il Comune: the mascot, a common card with legs.                     */
/* ------------------------------------------------------------------ */

export type Pose = "run" | "sleep" | "lost" | "party" | "wave";

const LIMB = { fill: "none", stroke: "currentColor", strokeWidth: 6, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const FACE = { fill: "none", stroke: "var(--rg-paper)", strokeWidth: 4, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function Card({ children }: { children?: ReactNode }) {
  return (
    <>
      <rect x="50" y="30" width="60" height="84" rx="9" fill="currentColor" />
      <rect x="56.5" y="36.5" width="47" height="71" rx="5" fill="none" stroke="var(--rg-paper)" strokeWidth="2" />
      <circle cx="97" cy="44" r="3.4" fill="var(--rg-paper)" />
      {children}
    </>
  );
}

const EYES = (
  <>
    <circle cx="70" cy="60" r="4.2" fill="var(--rg-paper)" />
    <circle cx="90" cy="60" r="4.2" fill="var(--rg-paper)" />
  </>
);
const SMILE = <path d="M67 74 Q80 88 93 74" {...FACE} />;

function Run() {
  return (
    <>
      <g {...LIMB} strokeWidth="4" opacity="0.9">
        <path d="M8 58 H32" />
        <path d="M2 78 H28" />
        <path d="M12 98 H34" />
      </g>
      <g transform="rotate(10 80 72)">
        <g {...LIMB}>
          <path d="M52 66 L36 82 L26 74" />
          <path d="M108 64 L126 54 L136 60" />
        </g>
        <g className="rg-legs-a" {...LIMB}>
          <path d="M70 112 L58 132 L46 130" />
          <path d="M90 112 L104 126 L110 140" />
        </g>
        <g className="rg-legs-b" {...LIMB}>
          <path d="M70 112 L72 132 L84 138" />
          <path d="M90 112 L86 130 L74 136" />
        </g>
        <Card>
          {EYES}
          {SMILE}
        </Card>
      </g>
    </>
  );
}

function Sleep() {
  return (
    <>
      <g {...LIMB}>
        <path d="M124 134 L140 132" />
        <path d="M124 124 L142 120" />
      </g>
      <rect x="28" y="92" width="98" height="52" rx="9" fill="currentColor" />
      <rect x="34.5" y="98.5" width="85" height="39" rx="5" fill="none" stroke="var(--rg-paper)" strokeWidth="2" />
      <path d="M48 112 q6 5 12 0" {...FACE} />
      <path d="M70 112 q6 5 12 0" {...FACE} />
      <circle cx="65" cy="126" r="3.5" fill="var(--rg-paper)" />
      <g fill="currentColor" style={{ fontFamily: "var(--font-rg-display)" }}>
        <text x="100" y="80" fontSize="18">z</text>
        <text x="116" y="60" fontSize="24">z</text>
        <text x="134" y="36" fontSize="32">z</text>
      </g>
    </>
  );
}

function Lost() {
  return (
    <>
      <g {...LIMB}>
        <path d="M108 62 L126 44 L114 30" />
        <path d="M52 70 L40 94" />
        <path d="M70 112 L66 140 L56 140" />
        <path d="M90 112 L94 140 L104 140" />
      </g>
      <Card>
        <circle cx="70" cy="62" r="4.2" fill="var(--rg-paper)" />
        <circle cx="91" cy="61" r="2.6" fill="var(--rg-paper)" />
        <path d="M85 51 L96 48" {...FACE} strokeWidth="3" />
        <path d="M66 80 q4 -5 8 0 t8 0 t8 0" {...FACE} strokeWidth="3.4" />
      </Card>
      <text x="14" y="58" fontSize="44" fill="currentColor" style={{ fontFamily: "var(--font-rg-display)" }}>
        ?
      </text>
    </>
  );
}

function Spark({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -9 C1 -3 3 -1 9 0 C3 1 1 3 0 9 C-1 3 -3 1 -9 0 C-3 -1 -1 -3 0 -9 Z"
      fill="currentColor"
    />
  );
}

function Party() {
  return (
    <>
      <Spark x={22} y={30} s={1.1} />
      <Spark x={140} y={22} s={0.8} />
      <Spark x={146} y={92} s={1} />
      <Spark x={14} y={104} s={0.7} />
      <g className="rg-hop">
        <g {...LIMB}>
          <path d="M52 62 L36 40 L30 24" />
          <path d="M108 62 L124 40 L130 24" />
          <path d="M70 112 L60 126 L72 136" />
          <path d="M90 112 L100 126 L88 136" />
        </g>
        <Card>
          <path d="M63 62 l6 -6 l6 6" {...FACE} strokeWidth="3.4" />
          <path d="M85 62 l6 -6 l6 6" {...FACE} strokeWidth="3.4" />
          <path d="M66 72 Q80 96 94 72 Z" fill="var(--rg-paper)" />
        </Card>
      </g>
    </>
  );
}

function Wave() {
  return (
    <>
      <g {...LIMB}>
        <path d="M52 70 L40 84 L52 94" />
        <path d="M70 112 L68 140 L58 140" />
        <path d="M90 112 L92 140 L102 140" />
      </g>
      <g className="rg-wave-a" {...LIMB}>
        <path d="M108 66 L126 50 L130 30" />
      </g>
      <g className="rg-wave-b" {...LIMB}>
        <path d="M108 66 L128 56 L142 40" />
      </g>
      <g {...LIMB} strokeWidth="3">
        <path d="M140 22 q8 6 6 16" />
      </g>
      <Card>
        {EYES}
        {SMILE}
      </Card>
    </>
  );
}

const POSES: Record<Pose, () => ReactNode> = { run: Run, sleep: Sleep, lost: Lost, party: Party, wave: Wave };

/** Il Comune, drawn by hand in four moods. Decorative unless given a label. */
export function Comune({ pose, className = "", label }: { pose: Pose; className?: string; label?: string }) {
  const Body = POSES[pose];
  return (
    <svg
      viewBox="0 0 160 160"
      className={`rg-comune rg-pose-${pose} ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <g className="rg-boil">
        <Body />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Mana: the symbols as printed on cards, redrawn flat and simple.      */
/* ------------------------------------------------------------------ */

const MANA_NAME: Record<string, string> = { W: "bianco", U: "blu", B: "nero", R: "rosso", G: "verde" };

/** The circle colours of the original symbols. */
const MANA_FILL: Record<string, string> = {
  W: "#f8f6d8",
  U: "#c1d7e9",
  B: "#cac5c0",
  R: "#e49977",
  G: "#a3c095",
};
/** The glyph colour of the original symbols. */
const GLYPH = "#0d0f0f";

/** The original glyphs, simplified: sun, drop, skull, fireball, tree. */
function faithful(c: string): ReactNode {
  const bg = MANA_FILL[c];
  switch (c) {
    case "W": // a sun with sixteen points and a light ring round its core
      return (
        <>
          <path
            d="M12 3.6 L13.91 7.38 L17.94 6.06 L16.62 10.09 L20.4 12 L16.62 13.91 L17.94 17.94 L13.91 16.62 L12 20.4 L10.09 16.62 L6.06 17.94 L7.38 13.91 L3.6 12 L7.38 10.09 L6.06 6.06 L10.09 7.38 Z"
            fill={GLYPH}
            stroke={GLYPH}
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="5.6" fill={bg} />
          <circle cx="12" cy="12" r="4.4" fill={GLYPH} />
        </>
      );
    case "U": // a drop with a glint
      return (
        <>
          <path d="M12.6 3.4 C10 6.4 6.6 10.6 6.6 14.4 C6.6 17.6 9 20 12 20 C15 20 17.4 17.6 17.4 14.6 C17.4 11.6 15.6 9.4 14.2 7.4 C13.2 6 12.6 4.8 12.6 3.4 Z" fill={GLYPH} />
          <path d="M14.4 13.2 C15.3 14.6 15.2 16.4 13.9 17.5" fill="none" stroke={bg} strokeWidth="1.4" strokeLinecap="round" />
        </>
      );
    case "B": // a skull
      return (
        <>
          <path
            d="M12 4.2 C7.8 4.2 5.2 7 5.2 10.6 C5.2 12.8 6.2 14.4 7.6 15.2 V17.6 C7.6 18.4 8.2 19 9 19 H15 C15.8 19 16.4 18.4 16.4 17.6 V15.2 C17.8 14.4 18.8 12.8 18.8 10.6 C18.8 7 16.2 4.2 12 4.2 Z"
            fill={GLYPH}
          />
          <ellipse cx="9.3" cy="11.2" rx="1.8" ry="2" fill={bg} />
          <ellipse cx="14.7" cy="11.2" rx="1.8" ry="2" fill={bg} />
          <path d="M12 13.4 L11 15.2 H13 Z" fill={bg} />
          <path d="M10.4 16.8 V19 M12 16.8 V19 M13.6 16.8 V19" stroke={bg} strokeWidth="0.8" />
        </>
      );
    case "R": // a fireball trailing up and right
      return (
        <>
          <path
            d="M5.4 13.2 C5.6 9 9.6 6.8 14.2 5.8 C16.4 5.3 18.2 4.6 19.8 3.6 C19.2 6.2 17.6 7.8 15.8 8.8 C17.2 8.9 18.5 8.7 19.6 8.2 C18.6 11.2 16.6 12.8 15 13.6 Z"
            fill={GLYPH}
          />
          <circle cx="10.4" cy="14.4" r="5.4" fill={GLYPH} />
          <path d="M7.7 15.8 C8 17.2 9.1 18.2 10.6 18.4" fill="none" stroke={bg} strokeWidth="1.3" strokeLinecap="round" />
        </>
      );
    case "G": // a round tree on a short trunk
      return (
        <>
          <circle cx="12" cy="8.2" r="4.2" fill={GLYPH} />
          <circle cx="8.3" cy="10.8" r="3.4" fill={GLYPH} />
          <circle cx="15.7" cy="10.8" r="3.4" fill={GLYPH} />
          <circle cx="12" cy="11.6" r="3.6" fill={GLYPH} />
          <path d="M11 12 L10.7 17.2 C10.6 18 9.7 18.8 8.4 19.3 H15.6 C14.3 18.8 13.4 18 13.3 17.2 L13 12 Z" fill={GLYPH} />
        </>
      );
  }
  return null;
}

/** An archetype's colours as mana symbols. */
export function Mana({ colors, size = 22 }: { colors: readonly string[]; size?: number }) {
  if (colors.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label={`mana ${colors.map((c) => MANA_NAME[c] ?? c).join(", ")}`}>
      {colors.map((c, i) => (
        <svg key={`${c}-${i}`} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="block">
          <circle cx="12" cy="12" r="12" fill={MANA_FILL[c] ?? "#ddd"} />
          {faithful(c)}
        </svg>
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Small typographic helpers.                                          */
/* ------------------------------------------------------------------ */

/** Section heading: a small label, a light serif title, an optional grey note. */
export function Head({
  label,
  title,
  aside,
  as: Tag = "h2",
  big = false,
  className = "",
}: {
  label?: ReactNode;
  title: ReactNode;
  aside?: ReactNode;
  as?: "h1" | "h2" | "h3";
  big?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && <p className="rg-eyebrow">{label}</p>}
      <Tag
        className={`rg-display rg-tight ${label ? "mt-2" : ""} ${
          big ? "text-[46px] leading-[0.95] lg:text-[80px]" : "text-[32px] leading-[1] lg:text-[44px]"
        }`}
      >
        {title}
      </Tag>
      {aside && <div className="rg-muted mt-4 text-[15px] leading-relaxed">{aside}</div>}
    </div>
  );
}

/** A white panel with its heading in a left column on desktop, like a printed menu. */
export function Section({
  label,
  title,
  aside,
  as,
  children,
  className = "",
}: {
  label?: ReactNode;
  title: ReactNode;
  aside?: ReactNode;
  /** h1 when the section opens the page. */
  as?: "h1" | "h2";
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rg-panel grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-12 ${className}`}>
      <Head label={label} title={title} aside={aside} as={as} className="lg:sticky lg:top-8 lg:self-start" />
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** A text link with a plain arrow, at least 44px tall. */
export function ArrowLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={`rg-arrowlink rg-display inline-flex min-h-11 items-center gap-2 ${className}`}>
      <span>{children}</span>
      <Arrow className="h-5 w-5 shrink-0" />
    </Link>
  );
}

/** Column labels above a list of rows; hidden from screen readers (each row says it all). */
export function ColHeads({ cols, className = "" }: { cols: { label: string; right?: boolean }[]; className?: string }) {
  return (
    <div aria-hidden="true" className={`rg-colheads grid ${className}`}>
      {cols.map((c) => (
        <span key={c.label} className={c.right ? "text-right" : ""}>
          {c.label}
        </span>
      ))}
    </div>
  );
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function weekday(iso: string) {
  return new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", weekday: "long" }).format(new Date(iso));
}

export function sameRomeDay(iso: string, now = new Date()) {
  const f = (d: Date) => new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", dateStyle: "short" }).format(d);
  return f(new Date(iso)) === f(now);
}

export function ordinal(n: number) {
  return `${n}°`;
}
