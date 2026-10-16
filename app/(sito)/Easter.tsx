"use client";

import { useEffect, useRef, type ReactNode } from "react";
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
function spark(box: DOMRect) {
  const into = layer();
  if (!into) return;
  const size = between(14, 26);
  // Somewhere on the name, a little past its edges, thrown away from its middle.
  const x = between(box.left - 6, box.right + 6);
  const y = between(box.top - 4, box.bottom + 4);
  const away = Math.atan2(y - (box.top + box.height / 2), x - (box.left + box.width / 2)) + between(-0.6, 0.6);
  const far = between(18, 42);
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

/** What each effect throws, all at once and then while pointed at, and how often. */
const PLAY = {
  fulmini: { first: 3, every: 200, each: 2, greet: 10, draw: (box: DOMRect) => spark(box) },
  nebbia: { first: 4, every: 260, each: 1, greet: 12, draw: (box: DOMRect, i: number) => puff(box, i % 3 === 0) },
} as const;

/**
 * A player's name with their easter egg, if they have one: point at it (or
 * hold a finger on it) and it plays, bolts thrown out like sparks or a mist
 * drifting past. `greet` plays a burst once when the page opens, for the
 * player's own page. Anyone else's name comes back as it is.
 */
export function Easter({ playerId, greet = false, children }: { playerId: number | string; greet?: boolean; children: ReactNode }) {
  const effect = effectOf(playerId);
  const el = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | null>(null);
  const count = useRef(0);

  const still = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const burst = (n: number) => {
    const box = el.current?.getBoundingClientRect();
    if (!box || !effect) return;
    for (let i = 0; i < n; i++) PLAY[effect].draw(box, count.current++);
  };
  const start = () => {
    if (!effect || still() || timer.current !== null) return;
    burst(PLAY[effect].first);
    timer.current = window.setInterval(() => burst(PLAY[effect].each), PLAY[effect].every);
  };
  const stop = () => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
  };

  useEffect(() => {
    if (!effect || !greet || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => {
      const box = el.current?.getBoundingClientRect();
      if (box) for (let i = 0; i < PLAY[effect].greet; i++) PLAY[effect].draw(box, i);
    }, 400);
    return () => window.clearTimeout(t);
  }, [effect, greet]);
  useEffect(() => stop, []);

  if (!effect) return <>{children}</>;
  return (
    <span ref={el} onPointerEnter={start} onPointerLeave={stop} onPointerCancel={stop}>
      {children}
    </span>
  );
}
