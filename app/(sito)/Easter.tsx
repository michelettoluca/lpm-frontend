"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { effectOf } from "@/app/lib/easter";

/* A lightning bolt in a 10 by 20 box: down to the left, a step, down again. */
const BOLT: [number, number][] = [
  [6, 0],
  [0.5, 11],
  [4.6, 11],
  [2.4, 20],
  [9.6, 7.4],
  [5.6, 7.4],
  [8.4, 0],
];

const between = (a: number, b: number) => a + Math.random() * (b - a);

/** A bolt as if drawn by hand: every corner nudged a little, so no two match. */
function boltPath() {
  return (
    BOLT.map(([x, y], i) => `${i ? "L" : "M"}${(x + between(-0.5, 0.5)).toFixed(2)} ${(y + between(-0.5, 0.5)).toFixed(2)}`).join(
      " ",
    ) + " Z"
  );
}

const SVG = "http://www.w3.org/2000/svg";

/** The layer the bolts fly in: over the whole screen, so no panel or table clips them. */
function layer(): HTMLElement | null {
  const site = document.querySelector<HTMLElement>(".lpm");
  if (!site) return null;
  let el = site.querySelector<HTMLElement>(":scope > .rg-sparks");
  if (!el) {
    el = document.createElement("div");
    el.className = "rg-sparks";
    el.setAttribute("aria-hidden", "true");
    site.append(el);
  }
  return el;
}

/** One bolt, flung out of the name from a point on its box, spinning, flashing and gone. */
function spark(box: DOMRect, scale = 1) {
  const into = layer();
  if (!into) return;
  const size = between(14, 26) * scale;
  // Somewhere on the name, a little past its edges, thrown away from its middle.
  const x = between(box.left - 6, box.right + 6);
  const y = between(box.top - 4, box.bottom + 4);
  const away = Math.atan2(y - (box.top + box.height / 2), x - (box.left + box.width / 2)) + between(-0.6, 0.6);
  const far = between(18, 42) * scale;
  const tilt = between(-35, 35);
  const spin = between(-50, 50);

  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "-1 -1 12 22");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size * 2));
  svg.classList.add("rg-spark");
  svg.style.left = `${x - size / 2}px`;
  svg.style.top = `${y - size}px`;
  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", boltPath());
  svg.append(path);
  into.append(svg);

  const dx = Math.cos(away) * far;
  const dy = Math.sin(away) * far;
  svg
    .animate(
      [
        { transform: `translate(0, 0) rotate(${tilt}deg) scale(0.3)`, opacity: 0 },
        { transform: `translate(${dx * 0.45}px, ${dy * 0.45}px) rotate(${tilt + spin * 0.4}deg) scale(1.05)`, opacity: 1, offset: 0.25 },
        // A flicker, like a spark catching.
        { opacity: 0.35, offset: 0.4 },
        { opacity: 1, offset: 0.5 },
        { transform: `translate(${dx}px, ${dy}px) rotate(${tilt + spin}deg) scale(0.6)`, opacity: 0 },
      ],
      { duration: between(650, 1000), easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" },
    )
    .finished.finally(() => svg.remove());
}

/**
 * A puff of mist, drifting past the name and thinning out. Behind ones blend
 * so the letters stay crisp over them (sito.css), front ones veil the letters
 * a little. Each is fixed on the screen on its own, not in a layer: a layer
 * would blend them with nothing.
 */
function puff(box: DOMRect, front: boolean) {
  const site = document.querySelector<HTMLElement>(".lpm");
  if (!site) return;
  const w = between(0.5, 1.1) * Math.max(80, Math.min(box.width, 260));
  const h = w * between(0.35, 0.55);
  const x = between(box.left - w * 0.3, box.right - w * 0.7);
  const y = between(box.top - h * 0.4, box.bottom - h * 0.6);
  const drift = between(24, 60) * (Math.random() < 0.5 ? -1 : 1);

  const el = document.createElement("div");
  el.className = `rg-mist ${front ? "rg-mist-front" : "rg-mist-back"}`;
  el.setAttribute("aria-hidden", "true");
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  site.append(el);

  el.animate(
    [
      { transform: "translate(0, 0) scale(0.6)", opacity: 0 },
      { opacity: 1, offset: 0.3 },
      { opacity: 0.8, offset: 0.7 },
      { transform: `translate(${drift}px, ${between(-10, 4)}px) scale(1.25)`, opacity: 0 },
    ],
    { duration: between(2200, 3600), easing: "ease-out" },
  ).finished.finally(() => el.remove());
}

type Play = { first: number; each: number; every: number; draw: (box: DOMRect, i: number) => void };

const MIST: Play = { first: 12, each: 1, every: 420, draw: (box, i) => puff(box, i % 3 === 0) };

/**
 * What each effect throws as it starts, then how much and how often while the
 * name is on screen: in full on the player's page, softer in the standings,
 * where several names play at once (the mist stays as it is).
 */
const PLAY: Record<"fulmini" | "nebbia", { full: Play; soft: Play }> = {
  fulmini: {
    full: { first: 10, each: 2, every: 550, draw: (box) => spark(box) },
    soft: { first: 3, each: 1, every: 950, draw: (box) => spark(box, 0.7) },
  },
  nebbia: { full: MIST, soft: MIST },
};

/**
 * Bolts or mist out of the name: on the player's page from when it opens and
 * for as long as the name is on screen; `soft`, in the standings, while its
 * row is pointed at.
 */
function Burst({ effect, soft, children }: { effect: keyof typeof PLAY; soft: boolean; children: ReactNode }) {
  const el = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const name = el.current;
    if (!name || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const play = PLAY[effect][soft ? "soft" : "full"];
    let n = 0;
    let timer: number | null = null;
    const burst = (count: number) => {
      const box = name.getBoundingClientRect();
      for (let i = 0; i < count; i++) play.draw(box, n++);
    };
    const start = () => {
      if (timer !== null) return;
      burst(n ? play.each : play.first);
      timer = window.setInterval(() => burst(play.each), play.every);
    };
    const stop = () => {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
    };
    if (soft) {
      // In the standings, while the player's row (or the name) is pointed at.
      const row = name.closest<HTMLElement>(".rg-row") ?? name;
      row.addEventListener("pointerenter", start);
      row.addEventListener("pointerleave", stop);
      row.addEventListener("pointercancel", stop);
      return () => {
        row.removeEventListener("pointerenter", start);
        row.removeEventListener("pointerleave", stop);
        row.removeEventListener("pointercancel", stop);
        stop();
      };
    }
    // On the player's page, from when it opens, while the name is on screen.
    const seen = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
    // A moment after the page opens, so the name is there to throw from.
    const t = window.setTimeout(() => seen.observe(name), 400);
    return () => {
      window.clearTimeout(t);
      seen.disconnect();
      stop();
    };
  }, [effect, soft]);

  return <span ref={el}>{children}</span>;
}

const PEACH = "\u{1F351}";

/**
 * Where the peaches stick around the name, in its box: the centre as a share
 * of its width and height, the size in em of the name's type, the tilt, and
 * whether it sits behind the letters or over them.
 */
const PEACHES = [
  { x: 1.04, y: 0.62, size: 0.7, tilt: 14, front: true },
  { x: 0.86, y: 0.02, size: 0.45, tilt: -14, front: false },
  { x: 0.1, y: -0.06, size: 0.52, tilt: 9, front: false },
  { x: 0.52, y: 0.5, size: 0.34, tilt: 24, front: true },
  { x: -0.04, y: 0.98, size: 0.4, tilt: -22, front: true },
  { x: 0.42, y: -0.14, size: 0.3, tilt: -30, front: false },
  { x: 1.12, y: 0.12, size: 0.36, tilt: 26, front: false },
  { x: 0.7, y: 1.04, size: 0.42, tilt: -8, front: true },
  { x: 0.3, y: 0.46, size: 0.38, tilt: -18, front: false },
  { x: 0.95, y: 0.4, size: 0.26, tilt: 34, front: true },
  { x: 0.22, y: 1.06, size: 0.3, tilt: 16, front: false },
];

/**
 * Peaches stuck around the name like stickers, of different sizes, some
 * behind the letters and some over them, popping on one after another as the
 * page opens.
 */
function Peaches({ children }: { children: ReactNode }) {
  return (
    <span className="rg-peaches">
      {children}
      {PEACHES.map((p, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`rg-sticker ${p.front ? "" : "rg-sticker-back"}`}
          style={
            {
              left: `${p.x * 100}%`,
              top: `${p.y * 100}%`,
              fontSize: `${p.size}em`,
              "--tilt": `${p.tilt}deg`,
              animationDelay: `${0.4 + i * 0.11}s`,
            } as CSSProperties
          }
        >
          {PEACH}
        </span>
      ))}
    </span>
  );
}

/**
 * A player's name with their easter egg, if they have one: bolts thrown out
 * like sparks, a mist drifting past, or peaches stuck on like stickers. On
 * the player's own page in full; `soft` in the standings, fewer and smaller,
 * where the peach is a single one, put after the name by `EasterMark`.
 * Anyone else's name comes back as it is.
 */
export function Easter({ playerId, soft = false, children }: { playerId: number | string; soft?: boolean; children: ReactNode }) {
  const effect = effectOf(playerId);
  if (!effect || (effect === "pesca" && soft)) return <>{children}</>;
  if (effect === "pesca") return <Peaches>{children}</Peaches>;
  return (
    <Burst effect={effect} soft={soft}>
      {children}
    </Burst>
  );
}

/**
 * The single peach of the standings, stuck just after the name and a little
 * above it, popping on while the row is pointed at (sito.css). Its own
 * element beside the name, not in it: a name cut short with an ellipsis
 * would cut it off too.
 */
export function EasterMark({ playerId }: { playerId: number | string }) {
  if (effectOf(playerId) !== "pesca") return null;
  return (
    <span aria-hidden="true" className="rg-sticker rg-sticker-inline" style={{ "--tilt": "12deg" } as CSSProperties}>
      {PEACH}
    </span>
  );
}
