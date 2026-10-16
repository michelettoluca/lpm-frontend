"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { effectOf } from "@/app/lib/easter";
import { COPIONE, type Battuta } from "./copione";

const between = (a: number, b: number) => a + Math.random() * (b - a);

const SVG = "http://www.w3.org/2000/svg";

/**
 * A puff of mist, drifting past the name and thinning out, or lying low
 * along its foot. Behind ones blend so the letters stay crisp over them
 * (sito.css), front ones are the card's paper and hide the letters in a
 * fog. Each is fixed on the screen on its own, not in a layer: a layer
 * would blend them with nothing.
 */
function puff(box: DOMRect, front: boolean, ground: boolean) {
  const site = document.querySelector<HTMLElement>(".lpm");
  if (!site) return;
  const span = Math.max(80, Math.min(box.width, 260));
  // A ground puff is wide and low, lying along the foot of the name, under
  // the last line, where the fog stays thick; the others drift anywhere on it.
  const w = ground ? between(0.8, 1.4) * span : between(0.5, 1.1) * span;
  const h = ground ? w * between(0.2, 0.3) : w * between(0.35, 0.55);
  const x = between(box.left - w * 0.3, box.right - w * 0.7);
  const y = ground ? box.bottom - h * between(0.3, 0.7) : between(box.top - h * 0.4, box.bottom - h * 0.6);
  const drift = (ground ? between(12, 30) : between(24, 60)) * (Math.random() < 0.5 ? -1 : 1);

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
      { transform: `translate(${drift}px, ${ground ? between(-3, 2) : between(-10, 4)}px) scale(1.25)`, opacity: 0 },
    ],
    { duration: ground ? between(3200, 4800) : between(2200, 3600), easing: "ease-out" },
  ).finished.finally(() => el.remove());
}

type Play = { first: number; each: number; every: number; draw: (box: DOMRect, i: number) => void };

// Every other puff in front, so the name keeps sinking into the fog; two in
// three along its foot, where the fog lies thickest.
const MIST: Play = { first: 16, each: 1, every: 340, draw: (box, i) => puff(box, i % 2 === 0, i % 3 !== 2) };

/** What the mist throws as it starts, then how much and how often: the same on his page and in the standings. */
const PLAY: Record<"nebbia", { full: Play; soft: Play }> = {
  nebbia: { full: MIST, soft: MIST },
};

/**
 * Mist out of the name: on the player's page from when it opens and for as
 * long as the name is on screen; `soft`, in the standings, while its row is
 * pointed at.
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

/** Room around the name for the charge, in px. */
const AROUND = 28;

/**
 * A point on the box around the name, a little outside it, and which way is
 * out there: `t` runs once round, from the top left, clockwise.
 */
function round(t: number, w: number, h: number, pad: number) {
  const W = w + 2 * pad;
  const H = h + 2 * pad;
  let d = (((t % 1) + 1) % 1) * 2 * (W + H);
  if (d < W) return { x: -pad + d, y: -pad, nx: 0, ny: -1 };
  d -= W;
  if (d < H) return { x: w + pad, y: -pad + d, nx: 1, ny: 0 };
  d -= H;
  if (d < W) return { x: w + pad - d, y: h + pad, nx: 0, ny: 1 };
  d -= W;
  return { x: -pad, y: h + pad - d, nx: -1, ny: 0 };
}

/** A crackle: a jagged arc clinging to a stretch of the box, or now and then shooting out of it. */
function arc(w: number, h: number, pad: number, amp: number): string {
  const t = Math.random();
  const out = Math.random() < 0.25;
  const steps = 7;
  const pts: string[] = [];
  if (out) {
    const p = round(t, w, h, pad);
    const far = between(10, 22);
    for (let k = 0; k <= steps; k++) {
      const f = k / steps;
      const jx = k && k < steps ? between(-amp, amp) : 0;
      pts.push(`${(p.x + p.nx * far * f + p.ny * jx).toFixed(1)} ${(p.y + p.ny * far * f + p.nx * jx).toFixed(1)}`);
    }
  } else {
    const span = between(0.03, 0.09);
    for (let k = 0; k <= steps; k++) {
      const p = round(t + (span * k) / steps, w, h, pad);
      const j = k && k < steps ? between(-amp, amp) : 0;
      pts.push(`${(p.x + p.nx * j).toFixed(1)} ${(p.y + p.ny * j).toFixed(1)}`);
    }
  }
  return `M${pts.join(" L")}`;
}

/**
 * Charges the name like a hero's fist in a film: jagged arcs crackling along
 * its edges, a new set every other frame, now and then shooting out of it.
 * Draws into the svg until stopped; `place` puts the svg over the name each
 * frame, where it isn't already.
 */
function electrify(svg: SVGSVGElement, name: HTMLElement, soft: boolean, place?: (box: DOMRect) => void): () => void {
  const crackles = document.createElementNS(SVG, "g");
  crackles.setAttribute("class", "rg-crackles");
  svg.append(crackles);
  name.classList.add("rg-charged");

  let frame = 0;
  let n = 0;
  const tick = () => {
    frame = requestAnimationFrame(tick);
    // A new set every other frame: faster would only blur.
    if (n++ % 2) return;
    const box = name.getBoundingClientRect();
    const w = box.width;
    const h = box.height;
    place?.(box);
    svg.setAttribute("width", String(w + 2 * AROUND));
    svg.setAttribute("height", String(h + 2 * AROUND));
    svg.setAttribute("viewBox", `${-AROUND} ${-AROUND} ${w + 2 * AROUND} ${h + 2 * AROUND}`);
    crackles.replaceChildren(
      ...Array.from({ length: soft ? 3 : 6 }, () => {
        const path = document.createElementNS(SVG, "path");
        path.setAttribute("d", arc(w, h, 3, soft ? 3 : 5));
        return path;
      }),
    );
  };
  frame = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(frame);
    name.classList.remove("rg-charged");
    svg.replaceChildren();
  };
}

/**
 * Diego's name, charged. On his page, from when it opens, while the name is
 * on screen, the charge drawn in the name's own box; `soft`, in the
 * standings, while the row is pointed at, over the screen, since a row cut
 * short would clip it.
 */
function Electric({ soft, children }: { soft: boolean; children: ReactNode }) {
  const el = useRef<HTMLSpanElement>(null);
  const charge = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const name = el.current;
    if (!name || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (soft) {
      const row = name.closest<HTMLElement>(".rg-row") ?? name;
      const site = document.querySelector<HTMLElement>(".lpm");
      let stop: (() => void) | null = null;
      let svg: SVGSVGElement | null = null;
      const start = () => {
        if (stop || !site) return;
        svg = document.createElementNS(SVG, "svg");
        svg.setAttribute("class", "rg-charge rg-charge-float");
        svg.setAttribute("aria-hidden", "true");
        site.append(svg);
        const s = svg;
        stop = electrify(s, name, true, (box) => {
          s.style.left = `${box.left - AROUND}px`;
          s.style.top = `${box.top - AROUND}px`;
        });
      };
      const end = () => {
        stop?.();
        svg?.remove();
        stop = null;
        svg = null;
      };
      row.addEventListener("pointerenter", start);
      row.addEventListener("pointerleave", end);
      row.addEventListener("pointercancel", end);
      return () => {
        row.removeEventListener("pointerenter", start);
        row.removeEventListener("pointerleave", end);
        row.removeEventListener("pointercancel", end);
        end();
      };
    }
    const svg = charge.current;
    if (!svg) return;
    let stop: (() => void) | null = null;
    const seen = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !stop) stop = electrify(svg, name, false);
      if (!entry.isIntersecting && stop) {
        stop();
        stop = null;
      }
    });
    seen.observe(name);
    return () => {
      seen.disconnect();
      stop?.();
    };
  }, [soft]);

  if (soft) return <span ref={el}>{children}</span>;
  return (
    <span className="rg-charge-host">
      <span ref={el}>{children}</span>
      <svg ref={charge} aria-hidden="true" className="rg-charge" />
    </span>
  );
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

/** A message bubble: his on the left, with his name over the first of a run; yours on the right. */
function bubble(b: Battuta, first: boolean): HTMLElement {
  const el = document.createElement("p");
  el.className = `rg-chat-msg ${b.who === "IO" ? "rg-chat-mine" : "rg-chat-his"}`;
  if (first && b.who === "LODOVICO") {
    const name = document.createElement("span");
    name.className = "rg-chat-name";
    name.textContent = "Lodovico";
    el.append(name);
  }
  el.append(b.text);
  return el;
}

/** The three dots of someone writing. */
function dots(): HTMLElement {
  const el = document.createElement("p");
  el.className = "rg-chat-msg rg-chat-his rg-chat-dots";
  el.append(...[0, 1, 2].map(() => document.createElement("i")));
  return el;
}

/** The script as messages: his lines broken at every sentence, the way he writes, one after another; yours whole. */
const CHAT: Battuta[] = COPIONE.flatMap((b) =>
  b.who === "LODOVICO" ? b.text.split(/(?<=[.?!])\s+/).map((text) => ({ who: b.who, text })) : [b],
);

/**
 * Plays the script as a chat: he fires off message after message, each
 * after a moment of writing, his stage directions a longer spell of it; you
 * get a word in now and then, after a pause. Only what fits is kept, the
 * oldest dropping off the top, and it starts over at the end. Returns what
 * stops it.
 */
function playChat(page: HTMLElement, from: number): () => void {
  let i = from % CHAT.length;
  let last: Battuta["who"] | null = null;
  let timer = 0;
  const trim = () => {
    while (page.childElementCount > 1 && page.scrollHeight > page.clientHeight + 24) page.firstElementChild?.remove();
  };
  const step = () => {
    const b = CHAT[i];
    i = (i + 1) % CHAT.length;
    const writing = b.who === "IO" ? null : dots();
    if (writing) {
      page.append(writing);
      trim();
    }
    // Yours after a while; his quick, a little longer the more he has to say.
    const wait = !b.who ? 1100 : b.who === "IO" ? 1700 : Math.min(650, 160 + b.text.length * 3);
    timer = window.setTimeout(() => {
      writing?.remove();
      if (b.who) {
        page.append(bubble(b, b.who !== last));
        last = b.who;
        trim();
      }
      timer = window.setTimeout(step, b.who === "IO" ? 700 : 60);
    }, wait);
  };
  step();
  return () => window.clearTimeout(timer);
}

/** The chat as it stands, for reduced motion: the first messages, still. */
function stillChat(page: HTMLElement) {
  let last: Battuta["who"] | null = null;
  const said = CHAT.filter((b) => b.who).slice(0, 10);
  page.replaceChildren(
    ...said.map((b) => {
      const el = bubble(b, b.who !== last);
      last = b.who;
      return el;
    }),
  );
}

/**
 * Lodovico's chat behind his page's first card, him messaging away for as
 * long as it is on screen. It sits in the card, which is its own layer,
 * behind the text; the name stays as it is.
 */
function Copione({ children }: { children: ReactNode }) {
  const page = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = page.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return stillChat(el);
    let stop: (() => void) | null = null;
    const seen = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !stop) stop = playChat(el, 0);
      if (!entry.isIntersecting && stop) {
        stop();
        stop = null;
      }
    });
    seen.observe(el);
    return () => {
      seen.disconnect();
      stop?.();
    };
  }, []);
  return (
    <>
      {children}
      <span ref={page} aria-hidden="true" className="rg-chat" />
    </>
  );
}

/** His chat in the standings: behind his row, small, from a random message, while the row is pointed at. */
function CopioneRow({ children }: { children: ReactNode }) {
  const el = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const row = el.current?.closest<HTMLElement>(".rg-row");
    if (!row) return;
    let shown: { page: HTMLElement; stop: () => void } | null = null;
    const start = () => {
      if (shown) return;
      row.classList.add("rg-chat-host");
      const page = document.createElement("span");
      page.className = "rg-chat rg-chat-row";
      page.setAttribute("aria-hidden", "true");
      row.prepend(page);
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (still) stillChat(page);
      shown = { page, stop: still ? () => {} : playChat(page, Math.floor(Math.random() * CHAT.length)) };
    };
    const stop = () => {
      if (!shown) return;
      shown.stop();
      shown.page.remove();
      shown = null;
    };
    row.addEventListener("pointerenter", start);
    row.addEventListener("pointerleave", stop);
    row.addEventListener("pointercancel", stop);
    return () => {
      row.removeEventListener("pointerenter", start);
      row.removeEventListener("pointerleave", stop);
      row.removeEventListener("pointercancel", stop);
      stop();
    };
  }, []);
  return <span ref={el}>{children}</span>;
}

/** Matteo Conte's lines, one at a time. */
const FUMETTI = ["Skibidi!", "Sleep del panzone!", "Faccio pippa!"];

/** A speech bubble, w by h, round-ended, its tail at the bottom on the given side. */
function bubblePath(w: number, h: number, tail: "left" | "right" | "middle"): string {
  const r = h / 2;
  const tx = tail === "left" ? w * 0.22 : tail === "right" ? w * 0.78 : w * 0.5;
  const tip = tail === "left" ? tx - h * 0.5 : tail === "right" ? tx + h * 0.5 : tx + h * 0.15;
  return [
    `M${r} 0 H${w - r}`,
    `A${r} ${r} 0 0 1 ${w - r} ${h}`,
    `H${tx + h * 0.22} L${tip} ${h + h * 0.55} L${tx - h * 0.18} ${h}`,
    `H${r} A${r} ${r} 0 0 1 ${r} 0 Z`,
  ].join(" ");
}

/**
 * One of his lines in a speech bubble drawn by hand, beside the name or
 * above it, its tail pointing back at it, springing out of the tail until
 * told to go. Fixed on the screen, so no row or panel clips it. The longer
 * the line, the smaller the type. Returns what takes it off.
 */
function speak(box: DOMRect, text: string, small: boolean): (() => void) | null {
  const site = document.querySelector<HTMLElement>(".lpm");
  if (!site) return null;
  const fit = Math.min(1, Math.max(0.72, 1 - (text.length - 9) * 0.03));
  const size = (small ? 12 : 18) * fit;
  const w = Math.max(80, text.length * size * 0.62 + size * 1.8);
  const h = size * 2.3;
  const side = Math.random();
  const where = side < 0.35 ? "left" : side < 0.7 ? "right" : "above";
  const x =
    where === "left"
      ? box.left - w * between(0.65, 0.9)
      : where === "right"
        ? box.right - w * between(0.1, 0.35)
        : between(box.left - w * 0.1, box.right - w * 0.9);
  const y = where === "above" ? box.top - h * between(1.1, 1.4) : box.top + box.height / 2 - h * between(0.9, 1.4);
  // The tail points back at the name.
  const tail = where === "left" ? "right" : where === "right" ? "left" : "middle";

  const el = document.createElement("div");
  el.className = "rg-comic";
  el.setAttribute("aria-hidden", "true");
  el.style.left = `${Math.max(4, Math.min(window.innerWidth - w - 4, x))}px`;
  el.style.top = `${y}px`;
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  el.style.fontSize = `${size}px`;
  el.style.rotate = `${between(-10, 10)}deg`;
  el.style.transformOrigin = tail === "left" ? "15% 130%" : tail === "right" ? "85% 130%" : "50% 130%";

  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("class", "rg-comic-shape");
  svg.setAttribute("viewBox", `-8 -8 ${w + 16} ${h * 1.6 + 16}`);
  svg.style.height = `${h * 1.6 + 16}px`;
  const path = document.createElementNS(SVG, "path");
  path.setAttribute("d", bubblePath(w, h, tail));
  path.setAttribute("class", "rg-comic-fill");
  svg.append(path);
  const words = document.createElement("span");
  words.className = "rg-comic-words";
  words.textContent = text;
  el.append(svg, words);
  site.append(el);

  el.animate([{ transform: "scale(0.2)", opacity: 0 }, { transform: "scale(1.06)", opacity: 1, offset: 0.6 }, { transform: "scale(1)" }], {
    duration: 300,
    easing: "cubic-bezier(0.2, 0.9, 0.3, 1)",
    fill: "forwards",
  });
  return () => {
    el.animate([{ opacity: 1 }, { opacity: 0, transform: "scale(0.85)" }], { duration: 160, easing: "ease-in", fill: "forwards" });
    // Gone by then even where the animation is held, as in a hidden tab.
    window.setTimeout(() => el.remove(), 200);
  };
}

/**
 * Matteo Conte's name, saying things: speech bubbles by it, one at a
 * time, each new line springing out as the last one goes. On his page from when it opens, while the name is on
 * screen; `soft`, in the standings, one at a time while the row is pointed at.
 */
function Comic({ soft, children }: { soft: boolean; children: ReactNode }) {
  const el = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const name = el.current;
    if (!name || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let n = Math.floor(Math.random() * FUMETTI.length);
    let timer: number | null = null;
    // One at a time: the new one lands as the old one pops.
    let off: (() => void) | null = null;
    const say = () => {
      off?.();
      // Nobody to talk to in a tab out of sight.
      off = document.hidden ? null : speak(name.getBoundingClientRect(), FUMETTI[n++ % FUMETTI.length], soft);
    };
    const start = () => {
      if (timer !== null) return;
      say();
      timer = window.setInterval(say, soft ? 1300 : 1100);
    };
    const stop = () => {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
      off?.();
      off = null;
    };
    if (soft) {
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
    const seen = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
    const t = window.setTimeout(() => seen.observe(name), 400);
    return () => {
      window.clearTimeout(t);
      seen.disconnect();
      stop();
    };
  }, [soft]);

  return <span ref={el}>{children}</span>;
}

/**
 * A player's name with their easter egg, if they have one: a charge of
 * lightning round it, a mist drifting past, peaches stuck on like stickers, or a
 * chat of his messages piling up behind it. On
 * the player's own page in full; `soft` in the standings, fewer and smaller,
 * where the peach is a single one, put after the name by `EasterMark`.
 * Anyone else's name comes back as it is.
 */
export function Easter({ playerId, soft = false, children }: { playerId: number | string; soft?: boolean; children: ReactNode }) {
  const effect = effectOf(playerId);
  if (!effect || (effect === "pesca" && soft)) return <>{children}</>;
  if (effect === "pesca") return <Peaches>{children}</Peaches>;
  if (effect === "copione") return soft ? <CopioneRow>{children}</CopioneRow> : <Copione>{children}</Copione>;
  if (effect === "fulmini") return <Electric soft={soft}>{children}</Electric>;
  if (effect === "fumetto") return <Comic soft={soft}>{children}</Comic>;
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
