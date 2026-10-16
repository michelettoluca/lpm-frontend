"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { effectOf } from "@/app/lib/easter";
import { COPIONE, type Battuta } from "./copione";

const between = (a: number, b: number) => a + Math.random() * (b - a);

const SVG = "http://www.w3.org/2000/svg";

/** Where the mouse last was on the screen: "" before anyone looks, " " before it first moves. */
let mouseAt = "";

/**
 * In the standings, `start` once a mouse moves over `host`, `stop` when it
 * leaves. Not on entering: a row scrolled under a still pointer, or a finger
 * scrolling the page across it, enters it too, and that isn't pointing at it.
 * Returns the undo.
 */
function whilePointedAt(host: HTMLElement, start: () => void, stop: () => void): () => void {
  if (!mouseAt) {
    // On the window, so after the rows: they compare against the move before.
    mouseAt = " ";
    window.addEventListener("pointermove", (e) => e.pointerType === "mouse" && (mouseAt = `${e.screenX},${e.screenY}`), { passive: true });
  }
  let on = false;
  const move = (e: PointerEvent) => {
    if (on || e.pointerType !== "mouse") return;
    // The mouse hasn't moved on the screen: the page has, under it.
    if (!e.movementX && !e.movementY && (mouseAt === " " || mouseAt === `${e.screenX},${e.screenY}`)) return;
    on = true;
    start();
  };
  const leave = () => {
    on = false;
    stop();
  };
  host.addEventListener("pointermove", move);
  host.addEventListener("pointerleave", leave);
  host.addEventListener("pointercancel", leave);
  return () => {
    host.removeEventListener("pointermove", move);
    host.removeEventListener("pointerleave", leave);
    host.removeEventListener("pointercancel", leave);
  };
}

/**
 * A puff of mist, drifting past the name and thinning out, or lying low
 * along its foot. Behind ones blend so the letters stay crisp over them
 * (sito.css), front ones are the card's paper and hide the letters in a
 * fog. Each is placed on the page on its own, not in a layer: a layer would
 * blend them with nothing.
 */
function puff(box: DOMRect, foot: number, front: boolean, ground: boolean) {
  const site = document.querySelector<HTMLElement>(".lpm");
  if (!site) return;
  const span = Math.max(80, Math.min(box.width, 260));
  // A ground puff is wide and low, lying along the foot of the name, under
  // the last line, where the fog stays thick; the others drift anywhere on it.
  const w = ground ? between(0.8, 1.4) * span : between(0.5, 1.1) * span;
  const h = ground ? w * between(0.2, 0.3) : w * between(0.35, 0.55);
  const x = between(box.left - w * 0.3, box.right - w * 0.7);
  // A ground puff's thick heart sits on the line the letters stand on.
  const y = ground ? foot - h * between(0.42, 0.58) : between(box.top - h * 0.4, box.bottom - h * 0.6);
  const drift = (ground ? between(12, 30) : between(24, 60)) * (Math.random() < 0.5 ? -1 : 1);

  const el = document.createElement("div");
  el.className = `rg-mist ${front ? "rg-mist-front" : "rg-mist-back"}`;
  el.setAttribute("aria-hidden", "true");
  // On the page, not the screen, so it scrolls with the name.
  const at = site.getBoundingClientRect();
  el.style.left = `${x - at.left}px`;
  el.style.top = `${y - at.top}px`;
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

/** `foot` is the line the name's last line of letters stands on. */
type Play = { first: number; each: number; every: number; draw: (box: DOMRect, i: number, foot: number) => void };

// Every other puff in front, so the name keeps sinking into the fog; two in
// three along its foot, where the fog lies thickest.
const MIST: Play = { first: 16, each: 1, every: 340, draw: (box, i, foot) => puff(box, foot, i % 2 === 0, i % 3 !== 2) };

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
      // Where the letters stand: an empty mark at the end of the name sits on it.
      const mark = document.createElement("span");
      mark.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
      name.append(mark);
      const foot = mark.getBoundingClientRect().bottom;
      mark.remove();
      for (let i = 0; i < count; i++) play.draw(box, n++, foot);
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
      const off = whilePointedAt(row, start, stop);
      return () => {
        off();
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
      const off = whilePointedAt(row, start, end);
      return () => {
        off();
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
/** Lisa Coronini's lobster: a sticker, cut out of the picture she was given, edged in white; 1405 by 973. */
const LOBSTER = "/easter/aragosta.webp";

/** A sticker by the name: its centre as a share of the name's box, its size in em of the name's type, its tilt, and whether it's over the letters. */
type Spot = { x: number; y: number; size: number; tilt: number; front?: boolean };

/** Where the peaches stick around the name, some behind the letters and some over them. */
const PEACHES: Spot[] = [
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
 * Stickers stuck around the name, Arturo Precioso's peaches of different
 * sizes, some behind the letters and some over them, popping on one after
 * another as the page opens.
 */
function Stickers({ emoji, spots, children }: { emoji: string; spots: Spot[]; children: ReactNode }) {
  return (
    <span className="rg-peaches">
      {children}
      {spots.map((p, i) => (
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
          {emoji}
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
    const off = whilePointedAt(row, start, stop);
    return () => {
      off();
      stop();
    };
  }, []);
  return <span ref={el}>{children}</span>;
}

/** Matteo Conte's lines, one at a time. */
const FUMETTI = ["Skibidi!", "Sleep del panzone!", "Faccio pippa!", "Perfora cazzeggio!", "Sarà per sempre sium!"];

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
 * told to go. On the page, over the cards, so no row or panel clips it and
 * it scrolls with the name. The longer
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
  // On the page, not the screen, so it scrolls with the name; kept inside it sideways.
  const at = site.getBoundingClientRect();
  el.style.left = `${Math.max(4, Math.min(at.width - w - 4, x - at.left))}px`;
  el.style.top = `${y - at.top}px`;
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
      const off = whilePointedAt(row, start, stop);
      return () => {
        off();
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

/** The gummy bears lifted out of the photo Andrea Forti's easter egg was asked with, each its own picture with its size. */
const BEAR_PICTURES: { src: string; w: number; h: number }[] = [
  { src: "/easter/orsetti/1.png", w: 97, h: 140 },
  { src: "/easter/orsetti/2.png", w: 140, h: 108 },
  { src: "/easter/orsetti/3.png", w: 101, h: 140 },
  { src: "/easter/orsetti/4.png", w: 102, h: 140 },
  { src: "/easter/orsetti/5.png", w: 140, h: 130 },
];

/**
 * One gummy bear falling through a box like rain: in at the top, turning
 * as it goes, out at the bottom, gone. Big or small; a third fall in front
 * of the text, the rest behind it, paler.
 */
function rainBear(back: HTMLElement, front: HTMLElement, small: boolean) {
  const W = back.clientWidth;
  const H = back.clientHeight;
  // Mostly small and middling, now and then a big one.
  const tall = small ? between(10, 18) : 16 + Math.random() ** 2.2 * 70;
  const ahead = Math.random() < 0.33;
  const pic = BEAR_PICTURES[Math.floor(Math.random() * BEAR_PICTURES.length)];
  const el = document.createElement("img");
  el.src = pic.src;
  el.alt = "";
  const wide = (tall * pic.w) / pic.h;
  el.style.width = `${wide}px`;
  el.style.height = `${tall}px`;
  el.className = "rg-bear";
  if (!ahead) el.classList.add("rg-bear-back");
  el.style.left = `${between(-wide * 0.3, W - wide * 0.7)}px`;
  el.style.top = `${-tall * 1.5}px`;
  (ahead ? front : back).append(el);
  const spin = between(-1, 1) * between(90, 360);
  const start = between(0, 360);
  const drift = between(-30, 30);
  const far = H + tall * 3;
  el.animate(
    [
      { transform: `translate(0, 0) rotate(${start}deg)` },
      { transform: `translate(${drift}px, ${far}px) rotate(${start + spin}deg)` },
    ],
    // Already falling at full speed when they come in, like rain: a steady
    // pace through the card, the big ones a touch quicker, as if nearer.
    { duration: (far / ((small ? 140 : 360) + tall * 3)) * 1000, easing: "linear", fill: "forwards" },
  ).finished.finally(() => el.remove());
}

/**
 * Andrea Forti's gummy bears raining through his first card, from when it
 * opens and while it's on screen, in front of the text and behind it;
 * `soft`, in the standings, through his row while it's pointed at. Nothing
 * for reduced motion.
 */
function Bears({ soft, children }: { soft: boolean; children: ReactNode }) {
  const el = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const name = el.current;
    const host = soft ? name?.closest<HTMLElement>(".rg-row") : name?.closest<HTMLElement>(".rg-panel");
    if (!name || !host || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Two layers: behind the text, and over it.
    const back = document.createElement("div");
    back.className = "rg-bears";
    back.setAttribute("aria-hidden", "true");
    const front = document.createElement("div");
    front.className = "rg-bears rg-bears-front";
    front.setAttribute("aria-hidden", "true");
    host.classList.add("rg-bears-host");
    host.prepend(back);
    host.append(front);

    let timer: number | null = null;
    const rain = () => {
      if (timer === null) timer = window.setInterval(() => !document.hidden && rainBear(back, front, soft), soft ? 160 : 260);
    };
    const stop = () => {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
    };
    const cleanup = () => {
      stop();
      back.remove();
      front.remove();
    };

    if (soft) {
      const end = () => {
        stop();
        back.replaceChildren();
        front.replaceChildren();
      };
      const off = whilePointedAt(host, rain, end);
      return () => {
        off();
        cleanup();
      };
    }
    const seen = new IntersectionObserver(([entry]) => (entry.isIntersecting ? rain() : stop()));
    seen.observe(host);
    return () => {
      seen.disconnect();
      cleanup();
    };
  }, [soft]);

  return <span ref={el}>{children}</span>;
}

/** Stefano D'Antonio's picture, lifted out of the one he gave and edged in white like a sticker: 613 by 720, twice the size it shows at. */
const PEEKER = { src: "/easter/stefano-dantonio.png", w: 613, h: 720 };

/** The edges he peeks in from, in turn, and how he's turned for each: head in, the cut edge on the screen's. */
const SIDES = [
  { side: "left", turn: 90 },
  { side: "right", turn: -90 },
  { side: "top", turn: 180 },
  { side: "bottom", turn: 0 },
] as const;

/**
 * Stefano D'Antonio peeking: his picture, edged in white like a sticker,
 * comes in near a corner of his first card's left edge, shy at first, then
 * all at once as far as his chest, has a quick look and is gone; then the
 * right edge, the top, the bottom. In the card, which clips it, from when
 * his page opens while it's on screen; `soft`, in the standings, the same
 * in his row while it's pointed at. Nothing for reduced motion.
 */
function Peek({ soft, children }: { soft: boolean; children: ReactNode }) {
  const el = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const name = el.current;
    const host = soft ? name?.closest<HTMLElement>(".rg-row") : name?.closest<HTMLElement>(".rg-panel");
    if (!name || !host || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const who = document.createElement("img");
    who.src = PEEKER.src;
    who.alt = "";
    who.setAttribute("aria-hidden", "true");
    who.className = "rg-peek";
    host.classList.add("rg-peek-host");
    host.append(who);

    let turn = 0;
    let timer: number | null = null;
    let on = false;
    const peek = () => {
      timer = null;
      if (!on) return;
      if (document.hidden) {
        timer = window.setTimeout(peek, 1000);
        return;
      }
      const { side, turn: angle } = SIDES[turn++ % SIDES.length];
      const bw = host.clientWidth;
      const bh = host.clientHeight;
      // In a card about half its height at most; in a row, just his head over its edge.
      const H = soft ? bh * 1.5 : Math.min(bh * 0.6, 300);
      const W = (H * PEEKER.w) / PEEKER.h;
      who.style.width = `${W}px`;
      who.style.height = `${H}px`;
      // Near a corner of that edge, one end or the other.
      const along = Math.random() < 0.5 ? between(0.08, 0.2) : between(0.8, 0.92);
      const [px, py] =
        side === "left" ? [0, bh * along] : side === "right" ? [bw, bh * along] : side === "top" ? [bw * along, 0] : [bw * along, bh];
      // How far in he comes: at first a bit of his head, in the end his head and chest.
      const peep = H * 0.12;
      const deep = H * 0.38;
      const at = (d: number, wobble = 0) =>
        `translate(${px}px, ${py}px) rotate(${angle + wobble}deg) translate(${-W / 2}px, ${-d}px)`;
      // Unsure: a little of his head, back a bit, a little more; then out he
      // pops all at once, has a quick look and is gone as fast.
      who
        .animate(
          [
            { transform: at(0), easing: "ease-out" },
            { transform: at(peep), offset: 0.2, easing: "ease-in-out" },
            { transform: at(peep * 0.45, -3), offset: 0.32, easing: "ease-in-out" },
            { transform: at(peep * 1.3, 2), offset: 0.48, easing: "ease-in-out" },
            { transform: at(peep * 1.2), offset: 0.58, easing: "cubic-bezier(0.2, 0.9, 0.3, 1.4)" },
            { transform: at(deep, 4), offset: 0.66, easing: "ease-in-out" },
            { transform: at(deep, -3), offset: 0.76, easing: "ease-in-out" },
            { transform: at(deep), offset: 0.82, easing: "cubic-bezier(0.6, 0, 0.9, 0.4)" },
            { transform: at(0) },
          ],
          { duration: 3400, fill: "forwards" },
        )
        .finished.then(() => {
          if (on) timer = window.setTimeout(peek, soft ? 500 : 1400);
        });
    };
    const start = () => {
      on = true;
      if (timer === null) timer = window.setTimeout(peek, soft ? 100 : 800);
    };
    const stop = () => {
      on = false;
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
    };
    const cleanup = () => {
      stop();
      who.remove();
    };

    if (soft) {
      const end = () => {
        stop();
        who.getAnimations().forEach((a) => a.cancel());
      };
      const off = whilePointedAt(host, start, end);
      return () => {
        off();
        cleanup();
      };
    }
    const seen = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
    seen.observe(host);
    return () => {
      seen.disconnect();
      cleanup();
    };
  }, [soft]);

  return <span ref={el}>{children}</span>;
}

/**
 * The infection's greens, after the Fungal Colossus gone bad, as in The
 * Last of Us: from a sick yellowish olive to a fluo green. Each colony takes
 * a hue between, drifting slowly along the edge so one shades into the
 * next, and a little off it, so they mix.
 */
const MOLD_HUES = [66, 138];
const MOLD_BODY = "#141c0e";
/** The glow comes in steps of hue, each drawn once; enough not to see them. */
const HALO_STEPS = 12;
const haloOf = (hue: number) =>
  Math.max(0, Math.min(HALO_STEPS - 1, Math.round(((hue - MOLD_HUES[0]) / (MOLD_HUES[1] - MOLD_HUES[0])) * (HALO_STEPS - 1))));

/**
 * One growth of the infection, nothing quite round: where, how big, when it
 * comes up and how long it takes to, its greens and its glow (-1 for none).
 * A lump of crust, a dark knobbly body ringed in green, pocked with glowing
 * pores; a husk, a lump gone hollow; a stalk of pin mould, bending in, its
 * head of spores lighting up; a puff of spore dust; a tuft of fuzz. `shape`
 * is the lump's or the husk's radius at each point round it, a share of r,
 * from `turn`; the dust's specks as dx, dy and size; the fuzz's hairs as
 * angle and length; the stalk's tip and bend as dx, dy. `pores` are a
 * lump's as dx, dy and size, shares of r.
 */
type Growth = {
  kind: "lump" | "husk" | "stalk" | "dust" | "fuzz";
  x: number;
  y: number;
  r: number;
  at: number;
  grow: number;
  ring: string;
  core: string;
  halo: number;
  turn: number;
  shape: number[];
  pores: number[];
};
/** A stretch of a root of the rot, when it starts to grow and how long it takes to. */
type Vein = { x1: number; y1: number; x2: number; y2: number; w: number; at: number; dur: number };
/** A stain of rot soaking into the card, spreading out from where it's dropped. */
type Stain = { x: number; y: number; r: number; at: number; grow: number; a: number };
/** A glow along a root, stamped where it passes. */
type Shine = { x: number; y: number; r: number; at: number };
/** All of an infection, and when it's done. */
type Rot = { growths: Growth[]; veins: Vein[]; stains: Stain[]; shines: Shine[]; end: number };

/**
 * A soft round glow in each step of green, and the rot's stain, drawn once
 * to stamp: a sick green, as if the card were wearing through to something
 * glowing; on light paper a sharper, acid one, to glow against the white.
 */
function sprites(dark: boolean): { halo: HTMLCanvasElement[]; stain: HTMLCanvasElement } {
  const draw = (stops: [number, string][]) => {
    const el = document.createElement("canvas");
    el.width = el.height = 64;
    const ctx = el.getContext("2d");
    if (!ctx) return el;
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    for (const [at, c] of stops) g.addColorStop(at, c);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return el;
  };
  return {
    halo: Array.from({ length: HALO_STEPS }, (_, i) => {
      const hue = MOLD_HUES[0] + (i / (HALO_STEPS - 1)) * (MOLD_HUES[1] - MOLD_HUES[0]);
      return draw([
        [0, `hsl(${hue} 90% 55% / 0.8)`],
        [0.4, `hsl(${hue} 90% 50% / 0.3)`],
        [1, `hsl(${hue} 90% 50% / 0)`],
      ]);
    }),
    stain: draw(
      dark
        ? [
            [0, "rgb(120 165 45 / 1)"],
            [0.45, "rgb(100 145 35 / 0.55)"],
            [1, "rgb(100 145 35 / 0)"],
          ]
        : [
            [0, "rgb(130 205 20 / 1)"],
            [0.45, "rgb(120 200 30 / 0.5)"],
            [1, "rgb(120 200 30 / 0)"],
          ],
    ),
  };
}

/** A box in the card, in px from its top left. */
type Box = { left: number; top: number; right: number; bottom: number };
type Point = { x: number; y: number };

/**
 * Where the name's letters are, in the card `at`: the box of each of its
 * lines, and points picked on the strokes of its letters, found by setting
 * its words again off screen in its own type, as wide as they show, and
 * looking where the ink is.
 */
function letters(name: HTMLElement, at: DOMRect): { lines: Box[]; ink: Point[] } {
  const lines: Box[] = [];
  const ink: Point[] = [];
  const style = getComputedStyle(name);
  const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const walk = document.createTreeWalker(name, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walk.nextNode(); node; node = walk.nextNode()) {
    const text = node.textContent?.trim();
    if (!text) continue;
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0);
    for (const r of rects) lines.push({ left: r.left - at.left, top: r.top - at.top, right: r.right - at.left, bottom: r.bottom - at.top });
    const r = rects[0];
    const off = document.createElement("canvas");
    off.width = Math.ceil(r?.width ?? 0);
    off.height = Math.ceil(r?.height ?? 0);
    const ctx = off.getContext("2d", { willReadFrequently: true });
    // A word broken over lines: anywhere in its boxes will do.
    if (rects.length !== 1 || !ctx || !off.width || !off.height) {
      for (const b of rects) for (let k = 0; k < 30; k++) ink.push({ x: between(b.left, b.right) - at.left, y: between(b.top, b.bottom) - at.top });
      continue;
    }
    ctx.font = font;
    const m = ctx.measureText(text);
    const up = m.fontBoundingBoxAscent;
    const down = m.fontBoundingBoxDescent;
    ctx.setTransform(r.width / Math.max(1, m.width), 0, 0, 1, 0, 0);
    ctx.fillText(text, 0, (r.height - up - down) / 2 + up);
    const data = ctx.getImageData(0, 0, off.width, off.height).data;
    for (let k = 0, found = 0; k < 4000 && found < 200; k++) {
      const x = Math.floor(Math.random() * off.width);
      const y = Math.floor(Math.random() * off.height);
      if (data[(y * off.width + x) * 4 + 3] > 128) {
        ink.push({ x: r.left - at.left + x, y: r.top - at.top + y });
        found++;
      }
    }
  }
  return { lines, ink };
}

/** Where what grows over the name is drawn: round its lines, a little out from them, in the card. */
function frontBox(lines: Box[], w: number, h: number, size: number): Box {
  const m = 60 * size + 10;
  const left = Math.max(0, Math.min(w, ...lines.map((x) => x.left)) - m);
  const top = Math.max(0, Math.min(h, ...lines.map((x) => x.top)) - m);
  return {
    left,
    top,
    right: Math.max(left, Math.min(w, Math.max(0, ...lines.map((x) => x.right)) + m)),
    bottom: Math.max(top, Math.min(h, Math.max(0, ...lines.map((x) => x.bottom)) + m)),
  };
}

/**
 * An infection of a card w by h out of the name in it, its `lines` and the
 * `ink` of its letters, and when each part of it comes: roots grow out from
 * under the name towards the card's edges, slowly over `time` ms, branching,
 * wandering, thinning out, glowing and staining the card where they pass, as
 * if wearing it through; a few lumps and specks round the name, behind it;
 * and, `front`, a few on its letters, over them, with roots running across
 * them, coming along the name from its start. `size` is the name's type, in
 * hundreds of px.
 */
function infect(w: number, h: number, lines: Box[], ink: Point[], time: number, small: boolean, size: number): { back: Rot; front: Rot } {
  const ph = Array.from({ length: 6 }, () => between(0, 2 * Math.PI));
  // Smaller in a narrow card, as on a phone; much smaller round a row.
  const scale = small ? 0.38 : Math.min(1, Math.max(0.5, w / 900));
  const back: Rot = { growths: [], veins: [], stains: [], shines: [], end: 0 };
  const front: Rot = { growths: [], veins: [], stains: [], shines: [], end: 0 };
  if (!ink.length) return { back, front };
  const left = Math.min(...lines.map((l) => l.left));
  const right = Math.max(...lines.map((l) => l.right));
  const pick = () => ink[Math.floor(Math.random() * ink.length)];
  // How far along the name, 0 at its start.
  const along = (p: Point) => (p.x - left) / Math.max(1, right - left);
  const span = MOLD_HUES[1] - MOLD_HUES[0];
  const hueAt = (x: number, y: number) => {
    const wave = (Math.sin(x / 83 + ph[0]) + Math.sin(y / 61 + ph[1]) + Math.sin((x + y) / 127 + ph[2])) / 3;
    return Math.max(MOLD_HUES[0], Math.min(MOLD_HUES[1], MOLD_HUES[0] + span * ((wave + 1) / 2) + between(-12, 12)));
  };

  const make = (kind: Growth["kind"], x: number, y: number, r: number, at: number, k: number): Growth => {
    const hue = hueAt(x, y);
    const g: Growth = {
      kind,
      x,
      y,
      r,
      at,
      grow: between(500, 900),
      ring: `hsl(${hue} 78% ${kind === "dust" ? 58 : 44}%)`,
      core: `hsl(${hue + 8} 90% 64%)`,
      halo: haloOf(hue),
      turn: between(0, 2 * Math.PI),
      shape: [],
      pores: [],
    };
    if (kind === "lump" || kind === "husk") {
      // Knobbly: a radius for each point round it, each softened by its neighbours'.
      const raw = Array.from({ length: 7 + Math.floor(Math.random() * 5) }, () => between(0.5, 1.5));
      g.shape = raw.map((v, i) => (2 * v + raw[(i + 1) % raw.length] + raw[(i + raw.length - 1) % raw.length]) / 4);
      if (kind === "lump") for (let n = Math.floor(Math.random() * 4); n > 0; n--) g.pores.push(between(-0.45, 0.45), between(-0.45, 0.45), between(0.1, 0.24));
    } else if (kind === "dust") {
      for (let n = 3 + Math.floor(Math.random() * 5); n > 0; n--) g.shape.push(between(-1, 1) * r, between(-1, 1) * r, between(0.5, 1.4) * Math.max(0.6, k));
    }
    return g;
  };

  // A root: a run of short stretches, wandering but on the whole the way it
  // set out, thinning to its end, branching now and then; its stretches
  // come `pace` px a ms. Behind, it glows and stains the card as it goes.
  const card: Box = { left: 0, top: 0, right: w, bottom: h };
  const root = (into: Rot, x: number, y: number, heading: number, len: number, width: number, when: number, pace: number, depth: number, within = card) => {
    // Short stretches, so a root bends smoothly.
    const step = small ? 2 : 3;
    let a = heading;
    for (let d = 0; d < len; d += step) {
      a += between(-0.27, 0.27) + (heading - a) * 0.05;
      const x2 = x + Math.cos(a) * step;
      const y2 = y + Math.sin(a) * step;
      if (x2 < within.left || y2 < within.top || x2 > within.right || y2 > within.bottom) return;
      const thick = Math.max(0.5, width * (1 - (d / len) * 0.85));
      into.veins.push({ x1: x, y1: y, x2, y2, w: thick, at: when, dur: step / pace });
      if (into === back) {
        if (Math.random() < 0.09) into.shines.push({ x: x2, y: y2, r: thick * between(3, 5), at: when });
        if (Math.random() < 0.021) into.stains.push({ x: x2, y: y2, r: between(16, 50) * scale, at: when, grow: 2500, a: between(0.08, 0.18) });
      }
      if (depth < 2 && Math.random() < 0.03) {
        root(into, x2, y2, a + (Math.random() < 0.5 ? -1 : 1) * between(0.5, 1.1), (len - d) * between(0.4, 0.7), thick * 0.7, when, pace, depth + 1, within);
      }
      x = x2;
      y = y2;
      when += step / pace;
    }
  };

  // Out from under the name to the edges, the first ones from its start:
  // each makes for somewhere on the card's edge, so in the end they reach
  // all of it, the far side too.
  const pace = Math.hypot(w, h) / (time * 1.1);
  for (let n = small ? 5 : 14; n > 0; n--) {
    const p = pick();
    const to = round(Math.random(), w, h, 0);
    const far = Math.hypot(to.x - p.x, to.y - p.y);
    const when = along(p) * (small ? 200 : 1800) + between(200, small ? 400 : 1800);
    back.stains.push({ x: p.x, y: p.y, r: (small ? between(10, 22) : between(40, 100)) * scale, at: when, grow: 4000, a: between(0.08, 0.16) });
    root(back, p.x, p.y, Math.atan2(to.y - p.y, to.x - p.x), far * between(0.6, 1.05), between(1.2, 2.8) * scale, when, pace, 0);
  }
  // A few lumps and specks round the name, over and under its lines.
  for (let n = small ? 3 : 14; n > 0; n--) {
    const p = pick();
    const a = between(0, 2 * Math.PI);
    const off = between(4, 36) * size;
    const roll = Math.random();
    const kind = roll < 0.5 ? "lump" : roll < 0.7 ? "husk" : "dust";
    back.growths.push(make(kind, p.x + Math.cos(a) * off, p.y + Math.sin(a) * off, between(2, 6) * size, along(p) * 2500 + between(300, 2500), size));
  }
  // A few on its letters, and fine roots crawling over them.
  for (let n = small ? 3 : 12; n > 0; n--) {
    const p = pick();
    const kind = Math.random() < 0.65 ? "lump" : "dust";
    front.growths.push(make(kind, p.x, p.y, between(1.5, 4.5) * size, along(p) * (small ? 300 : 2600) + between(0, small ? 200 : 900), size));
  }
  // Roots across the letters, mostly along the name, kept to where the front is drawn.
  const over = frontBox(lines, w, h, size);
  for (let n = small ? 2 : 8; n > 0; n--) {
    const p = pick();
    const heading = (Math.random() < 0.5 ? 0 : Math.PI) + between(-0.7, 0.7);
    root(front, p.x, p.y, heading, between(40, 160) * size, between(1, 2.4) * size, along(p) * 3500 + between(300, 3500), small ? 0.06 : 0.016, 1, over);
  }

  for (const rot of [back, front]) {
    for (const g of rot.growths) rot.end = Math.max(rot.end, g.at + g.grow);
    for (const v of rot.veins) rot.end = Math.max(rot.end, v.at + v.dur);
    for (const t of rot.stains) rot.end = Math.max(rot.end, t.at + t.grow);
  }
  return { back, front };
}

/**
 * Where an infection is drawn: the stains and the glow (behind the name
 * only), what's done, the roots with it, the green down the roots, over
 * them so the next stretch of a root never covers it, and what's growing. Only the
 * stains and what's growing are drawn afresh each frame; the rest only
 * ever gets more of it.
 */
type MoldCanvases = {
  stain?: CanvasRenderingContext2D;
  glow?: CanvasRenderingContext2D;
  done: CanvasRenderingContext2D;
  cores: CanvasRenderingContext2D;
  growing: CanvasRenderingContext2D;
};

const clear = (ctx: CanvasRenderingContext2D) => {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
};

const STALK = "hsl(78 25% 28%)";

/** Where a growth glows from, and how far: a stalk at its head. */
const glowOf = (g: Growth) =>
  g.kind === "stalk" ? { x: g.x + g.shape[0], y: g.y + g.shape[1], r: g.r * 4 } : { x: g.x, y: g.y, r: g.r * (g.kind === "dust" ? 2 : 2.6) };

/** A growth, `e` of the way grown (a lump a little past it as it lands). */
function drawGrowth(ctx: CanvasRenderingContext2D, g: Growth, e: number) {
  const { x, y, r, shape } = g;
  if (g.kind === "lump" || g.kind === "husk") {
    const n = shape.length;
    const pt = (i: number) => {
      const a = g.turn + ((i % n) / n) * 2 * Math.PI;
      const k = shape[i % n] * r * e;
      return [x + Math.cos(a) * k, y + Math.sin(a) * k];
    };
    // A smooth knobbly outline through the midpoints.
    const [px, py] = pt(0);
    const [qx, qy] = pt(1);
    ctx.beginPath();
    ctx.moveTo((px + qx) / 2, (py + qy) / 2);
    for (let i = 1; i <= n; i++) {
      const [ax, ay] = pt(i);
      const [bx, by] = pt(i + 1);
      ctx.quadraticCurveTo(ax, ay, (ax + bx) / 2, (ay + by) / 2);
    }
    ctx.closePath();
    if (g.kind === "lump") {
      ctx.fillStyle = MOLD_BODY;
      ctx.fill();
    }
    ctx.strokeStyle = g.ring;
    ctx.lineWidth = Math.max(0.7, r * e * (g.kind === "lump" ? 0.18 : 0.26));
    ctx.stroke();
    ctx.fillStyle = g.core;
    for (let i = 0; i < g.pores.length; i += 3) {
      ctx.beginPath();
      ctx.arc(x + g.pores[i] * r * e, y + g.pores[i + 1] * r * e, g.pores[i + 2] * r * e, 0, 2 * Math.PI);
      ctx.fill();
    }
    return;
  }
  if (g.kind === "stalk") {
    // The stalk first, along its bend, then its head swelling at the tip.
    const f = Math.min(1, e * 1.5);
    const [tx, ty, cx, cy] = shape;
    const bx = 2 * (1 - f) * f * cx + f * f * tx;
    const by = 2 * (1 - f) * f * cy + f * f * ty;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + cx * f, y + cy * f, x + bx, y + by);
    ctx.strokeStyle = STALK;
    ctx.lineWidth = Math.max(0.6, r * 0.35);
    ctx.stroke();
    const head = Math.max(0, (e - 0.55) / 0.45);
    if (head > 0) {
      ctx.beginPath();
      ctx.fillStyle = g.ring;
      ctx.arc(x + bx, y + by, r * head, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = g.core;
      ctx.arc(x + bx - r * 0.25 * head, y + by - r * 0.2 * head, r * 0.5 * head, 0, 2 * Math.PI);
      ctx.fill();
    }
    return;
  }
  if (g.kind === "dust") {
    ctx.fillStyle = g.ring;
    for (let i = 0; i < shape.length; i += 3) {
      ctx.beginPath();
      ctx.arc(x + shape[i] * e, y + shape[i + 1] * e, shape[i + 2] * e, 0, 2 * Math.PI);
      ctx.fill();
    }
    return;
  }
  ctx.beginPath();
  for (let i = 0; i < shape.length; i += 2) {
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(shape[i]) * shape[i + 1] * e, y + Math.sin(shape[i]) * shape[i + 1] * e);
  }
  ctx.strokeStyle = g.ring;
  ctx.lineWidth = 0.6;
  ctx.stroke();
}

/** The roots' colours: moss with a bright sick green down the thick of it; on light paper a deeper green, with an acid lime. */
const ROOT = { light: ["hsl(110 60% 19%)", "hsl(86 100% 48%)"], dark: ["hsl(84 30% 24%)", "hsl(95 85% 52%)"] };

/**
 * The infection at `now` ms, from where it was painted at `then` (from
 * scratch when null): each stain soaked in so far; the roots grown since
 * and their glow, added, and the stretches still growing; each growth that has started since, its glow
 * stamped; each done since, drawn for good; and each still growing, as far
 * as it has.
 */
function paintMold(c: MoldCanvases, rot: Rot, then: number | null, now: number, art: ReturnType<typeof sprites>, dark: boolean) {
  const fresh = (at: number) => at <= now && (then === null || at > then);
  if (c.stain) {
    clear(c.stain);
    for (const s of rot.stains) {
      const k = Math.min(1, (now - s.at) / s.grow);
      if (k <= 0) continue;
      const r = s.r * (1 - (1 - k) ** 2);
      // White paper takes more of it to glow.
      c.stain.globalAlpha = Math.min(1, s.a * k * (dark ? 0.8 : 1.9));
      c.stain.drawImage(art.stain, s.x - r, s.y - r, 2 * r, 2 * r);
    }
    c.stain.globalAlpha = 1;
  }
  if (then === null) for (const ctx of [c.glow, c.done, c.cores]) if (ctx) clear(ctx);
  if (c.glow) {
    // Along the roots, a glow.
    c.glow.globalAlpha = dark ? 0.22 : 0.5;
    for (const g of rot.shines) if (fresh(g.at)) c.glow.drawImage(art.halo[HALO_STEPS >> 1], g.x - g.r, g.y - g.r, 2 * g.r, 2 * g.r);
    c.glow.globalAlpha = 1;
  }
  // The roots: each stretch drawn for good once grown; the one growing,
  // as far as it has, afresh, so a root creeps on rather than steps.
  const [body, core] = ROOT[dark ? "dark" : "light"];
  clear(c.growing);
  for (const ctx of [c.done, c.cores, c.growing]) ctx.lineCap = "round";
  const stroke = (ctx: CanvasRenderingContext2D, seg: Vein, f: number, colour: string, width: number) => {
    ctx.beginPath();
    ctx.moveTo(seg.x1, seg.y1);
    ctx.lineTo(seg.x1 + (seg.x2 - seg.x1) * f, seg.y1 + (seg.y2 - seg.y1) * f);
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.stroke();
  };
  const coreWidth = dark ? 0.32 : 0.45;
  const growing: [Vein, number][] = [];
  for (const seg of rot.veins) {
    if (seg.at > now) continue;
    const end = seg.at + seg.dur;
    if (end > now) {
      growing.push([seg, (now - seg.at) / seg.dur]);
      continue;
    }
    if (!fresh(end)) continue;
    stroke(c.done, seg, 1, body, seg.w);
    if (seg.w > 1.3) stroke(c.cores, seg, 1, core, seg.w * coreWidth);
  }
  for (const [seg, f] of growing) stroke(c.growing, seg, f, body, seg.w);
  for (const [seg, f] of growing) if (seg.w > 1.3) stroke(c.growing, seg, f, core, seg.w * coreWidth);

  for (const g of rot.growths) {
    if (g.at > now) continue;
    if (c.glow && fresh(g.at)) {
      const o = glowOf(g);
      c.glow.drawImage(art.halo[g.halo], o.x - o.r, o.y - o.r, 2 * o.r, 2 * o.r);
    }
    const done = g.at + g.grow;
    if (done <= now) {
      if (then === null || done > then) drawGrowth(c.done, g, 1);
      continue;
    }
    const k = (now - g.at) / g.grow;
    // Lumps land with a little overshoot; the rest just grow.
    const e = g.kind === "lump" || g.kind === "husk" ? 1 + 2.7 * (k - 1) ** 3 + 1.7 * (k - 1) ** 2 : 1 - (1 - k) ** 2;
    drawGrowth(c.growing, g, e);
  }
}

/** Whether the card is dark: its paper, from the colour it's painted. */
function darkPaper(el: HTMLElement): boolean {
  const [r, g, b] = (getComputedStyle(el).backgroundColor.match(/[\d.]+/g) ?? ["255", "255", "255"]).map(Number);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110;
}

/**
 * Demetrio Morselli's infection, out of his name: a few lumps and fine
 * roots on its letters, coming along it from its start, and from under it
 * roots growing out across his first card to its edges, slowly, branching,
 * glowing and staining the card as if wearing it through, a few lumps and
 * specks round the name; then it stays, glowing. From when the card is on
 * screen, its clock stopped while it isn't. What's behind the name is
 * behind its text, clipped by the card. `soft`, in the standings, quick and
 * small out of his name in his row while it's pointed at. For reduced
 * motion, the card already taken, still; nothing in the row.
 */
function Mold({ soft, children }: { soft: boolean; children: ReactNode }) {
  const el = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const name = el.current;
    const host = soft ? name?.closest<HTMLElement>(".rg-row") : name?.closest<HTMLElement>(".rg-panel");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!name || !host || (still && soft)) return;
    const sheet = (layer: HTMLElement, key: string) => {
      const canvas = document.createElement("canvas");
      canvas.className = `rg-mold-${key}`;
      layer.append(canvas);
      return canvas;
    };
    // Behind the text, over the whole card; over the text, just round the name.
    const back = document.createElement("div");
    back.className = "rg-mold";
    const front = document.createElement("div");
    front.className = "rg-mold rg-mold-front";
    for (const layer of [back, front]) layer.setAttribute("aria-hidden", "true");
    const behind = { stain: sheet(back, "stain"), glow: sheet(back, "glow"), done: sheet(back, "done"), cores: sheet(back, "cores"), growing: sheet(back, "growing") };
    const over = { done: sheet(front, "done"), cores: sheet(front, "cores"), growing: sheet(front, "growing") };
    host.classList.add("rg-mold-host");
    host.append(back, front);
    const cleanup = [() => back.remove(), () => front.remove()];
    const ctx = (c: HTMLCanvasElement) => c.getContext("2d");
    const b = { stain: ctx(behind.stain), glow: ctx(behind.glow), done: ctx(behind.done), cores: ctx(behind.cores), growing: ctx(behind.growing) };
    const f = { done: ctx(over.done), cores: ctx(over.cores), growing: ctx(over.growing) };
    if (!b.stain || !b.glow || !b.done || !b.cores || !b.growing || !f.done || !f.cores || !f.growing) return () => cleanup.forEach((c) => c());
    const backC: MoldCanvases = { stain: b.stain, glow: b.glow, done: b.done, cores: b.cores, growing: b.growing };
    const frontC: MoldCanvases = { done: f.done, cores: f.cores, growing: f.growing };

    const time = soft ? 2000 : 24000;
    const none: Rot = { growths: [], veins: [], stains: [], shines: [], end: 0 };
    let rot = { back: none, front: none };
    let end = 0;
    let dark = darkPaper(host);
    let art = sprites(dark);
    // How far along it is, in ms, and when that clock started, while it runs.
    let elapsed = 0;
    let since: number | null = null;
    let painted: number | null = null;
    let frame = 0;

    const size = (c: HTMLCanvasElement, w: number, h: number, d: number, ox = 0, oy = 0) => {
      c.width = Math.round(w * d);
      c.height = Math.round(h * d);
      c.getContext("2d")?.setTransform(d, 0, 0, d, -ox * d, -oy * d);
    };
    const fit = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      const { lines, ink } = letters(name, host.getBoundingClientRect());
      const type = Math.min(1.1, Math.max(0.2, parseFloat(getComputedStyle(name).fontSize) / 100));
      rot = infect(w, h, lines, ink, time, soft, type);
      end = Math.max(rot.back.end, rot.front.end);
      // Sharp enough, and easy on memory; the soft ones need no more than a pixel each.
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      size(behind.stain, w, h, 1);
      size(behind.glow, w, h, 1);
      for (const c of [behind.done, behind.cores, behind.growing]) size(c, w, h, dpr);
      // The front just over the name, and a little round it.
      const o = frontBox(lines, w, h, type);
      Object.assign(front.style, { left: `${o.left}px`, top: `${o.top}px`, width: `${o.right - o.left}px`, height: `${o.bottom - o.top}px` });
      for (const c of [over.done, over.cores, over.growing]) size(c, o.right - o.left, o.bottom - o.top, dpr, o.left, o.top);
      painted = null;
    };
    const now = () => (since === null ? elapsed : elapsed + performance.now() - since);
    const paint = (t: number) => {
      paintMold(backC, rot.back, painted, t, art, dark);
      paintMold(frontC, rot.front, painted, t, art, dark);
      painted = t;
    };
    const tick = () => {
      const t = now();
      paint(t);
      frame = t < end ? requestAnimationFrame(tick) : 0;
    };
    const start = () => {
      if (since !== null || elapsed >= end) return;
      since = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      elapsed = now();
      since = null;
      cancelAnimationFrame(frame);
      frame = 0;
    };
    cleanup.push(stop);
    // A card that changes size or theme is laid out again, as far along as it was.
    const redo = () => {
      dark = darkPaper(host);
      art = sprites(dark);
      fit();
      paint(now());
    };
    const resized = new ResizeObserver(redo);
    const themed = new MutationObserver(redo);
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    cleanup.push(() => resized.disconnect(), () => themed.disconnect(), () => scheme.removeEventListener("change", redo));

    let gone = false;
    cleanup.push(() => (gone = true));
    // The letters are found in the name's own type: once it's there.
    document.fonts.ready.then(() => {
      if (gone) return;
      resized.observe(host);
      themed.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class", "style"] });
      scheme.addEventListener("change", redo);
      if (still) {
        fit();
        elapsed = end;
        paint(end);
        return;
      }
      if (soft) {
        const enter = () => {
          // A fresh one each time.
          stop();
          elapsed = 0;
          fit();
          for (const layer of [back, front]) layer.classList.add("rg-mold-on");
          start();
        };
        const leave = () => {
          stop();
          for (const layer of [back, front]) layer.classList.remove("rg-mold-on");
        };
        cleanup.push(whilePointedAt(host, enter, leave));
        return;
      }
      for (const layer of [back, front]) layer.classList.add("rg-mold-on");
      const seen = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
      seen.observe(host);
      cleanup.push(() => seen.disconnect());
    });
    return () => cleanup.forEach((c) => c());
  }, [soft]);

  return <span ref={el}>{children}</span>;
}

/** Tommaso Cavallini's hand, left to right: his lands and his goblins. */
const FURNACE = "/easter/ventaglio/great-furnace.webp";
const RAIDER = "/easter/ventaglio/goblin-tomb-raider.webp";
const HAND = [FURNACE, RAIDER, FURNACE, RAIDER, RAIDER];
/** How far each card in the hand is turned, from the first to the last. */
const SPREAD = 28;
const turnOf = (i: number) => -SPREAD + (2 * SPREAD * i) / (HAND.length - 1);

/**
 * Lisa Coronini's lobster, of comic size: one huge one at the top right of
 * her first card, cut off by its right edge; it comes in from that corner
 * down towards the middle as the page opens, a jerky step at a time,
 * turning right and left, strikes a pose, then sways a little (sito.css).
 * Over the text.
 */
function Lobster({ children }: { children: ReactNode }) {
  const el = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const host = el.current?.closest<HTMLElement>(".rg-panel");
    if (!host) return;
    const lobster = document.createElement("img");
    lobster.className = "rg-lobster";
    lobster.src = LOBSTER;
    lobster.alt = "";
    lobster.setAttribute("aria-hidden", "true");
    host.append(lobster);
    return () => lobster.remove();
  }, []);

  return <span ref={el}>{children}</span>;
}

/**
 * Tommaso Cavallini's hand of cards, fanned out in the bottom right corner
 * of his first card as if held just under it: dealt in one after another
 * from under its edge as the page opens, then rocking a little in the hand
 * (sito.css). Over the card's text; the card's edges cut them off.
 */
function Fan({ children }: { children: ReactNode }) {
  const el = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const host = el.current?.closest<HTMLElement>(".rg-panel");
    if (!host) return;
    const hand = document.createElement("div");
    hand.className = "rg-fan";
    hand.setAttribute("aria-hidden", "true");
    HAND.forEach((src, i) => {
      const card = document.createElement("img");
      card.src = src;
      card.alt = "";
      card.className = "rg-fan-card";
      card.style.setProperty("--turn", `${turnOf(i)}deg`);
      card.style.setProperty("--deal", `${0.35 + i * 0.12}s`);
      hand.append(card);
    });
    host.append(hand);
    return () => hand.remove();
  }, []);

  return <span ref={el}>{children}</span>;
}

/**
 * Filippo Pezza's championship belt, for winning the Paupergeddon in Pisa
 * in 2024: its centre plate, drawn about its middle, 380 wide. Gold, its
 * edge notched at the corners, wings onto the strap, gems at its sides; in
 * the middle a red enamel field with PAUPERGEDDON round the top, CHAMPION
 * across it and PISA 2024 under it; and a glint that
 * sweeps across the gold now and then (sito.css). Its gradients are named
 * on the page, for the side plates too.
 */
const PLATE_EDGE =
  "M0 -96C40 -96 70 -84 92 -70L118 -78C138 -56 152 -30 152 0C152 30 138 56 118 78L92 70C70 84 40 96 0 96C-40 96 -70 84 -92 70L-118 78C-138 56 -152 30 -152 0C-152 -30 -138 -56 -118 -78L-92 -70C-70 -84 -40 -96 0 -96Z";
const BELT_PLATE = `<svg class="rg-belt-plate" viewBox="-190 -126 380 226" aria-hidden="true">
  <defs>
    <linearGradient id="rg-belt-gold" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="#fff4c4"/><stop offset="0.22" stop-color="#f3cf5c"/><stop offset="0.45" stop-color="#b8861f"/>
      <stop offset="0.62" stop-color="#f0cb58"/><stop offset="0.82" stop-color="#fff0b0"/><stop offset="1" stop-color="#9a6d14"/>
    </linearGradient>
    <linearGradient id="rg-belt-red" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff4a57"/><stop offset="0.5" stop-color="#c50f22"/><stop offset="1" stop-color="#7d0714"/>
    </linearGradient>
    <linearGradient id="rg-belt-glint" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="rg-belt-clip"><path d="${PLATE_EDGE}"/></clipPath>
    <path id="rg-belt-arc" d="M-86 -2A86 46 0 0 1 86 -2"/>
  </defs>
  <g fill="url(#rg-belt-gold)" stroke="#6b4a0c" stroke-width="3" stroke-linejoin="round">
    <path d="M-150 -40L-188 -30L-188 30L-150 40Z"/><path d="M150 -40L188 -30L188 30L150 40Z"/>
    <path d="${PLATE_EDGE}"/>
  </g>
  <path d="${PLATE_EDGE}" transform="scale(0.9)" fill="none" stroke="#fff6cf" stroke-width="2.5"/>
  <path d="${PLATE_EDGE}" transform="scale(0.85)" fill="none" stroke="#7a560f" stroke-width="1.5"/>
  <ellipse rx="112" ry="66" fill="url(#rg-belt-red)" stroke="#6b4a0c" stroke-width="3"/>
  <ellipse rx="104" ry="59" fill="none" stroke="#ffd75e" stroke-width="1.5"/>
  <text class="rg-belt-words" font-size="19" letter-spacing="1.5" fill="#ffe27a"><textPath href="#rg-belt-arc" startOffset="50%" text-anchor="middle">PAUPERGEDDON</textPath></text>
  <text class="rg-belt-words" y="16" font-size="28" letter-spacing="1" text-anchor="middle" fill="url(#rg-belt-gold)" stroke="#5a3c06" stroke-width="0.8">CHAMPION</text>
  <text class="rg-belt-words" y="45" font-size="14" letter-spacing="2" text-anchor="middle" fill="#ffe27a">★ PISA 2024 ★</text>
  <g stroke="#6b4a0c" stroke-width="2"><circle cx="-132" cy="0" r="7" fill="#c50f22"/><circle cx="132" cy="0" r="7" fill="#c50f22"/><circle cx="0" cy="83" r="6" fill="#c50f22"/></g>
  <g fill="#fff" opacity="0.8"><circle cx="-134" cy="-2" r="2"/><circle cx="130" cy="-2" r="2"/><circle cx="-2" cy="81" r="1.6"/></g>
  <g clip-path="url(#rg-belt-clip)"><rect class="rg-belt-glint" x="-40" y="-110" width="80" height="220" fill="url(#rg-belt-glint)"/></g>
</svg>`;
/** A side plate on the strap: gold, a red disc, a gold star. */
const BELT_SIDE = `<svg class="rg-belt-side" viewBox="-40 -36 80 72" aria-hidden="true">
  <path d="M-34 -30H34Q38 -30 38 -26V26Q38 30 34 30H-34Q-38 30 -38 26V-26Q-38 -30 -34 -30Z" fill="url(#rg-belt-gold)" stroke="#6b4a0c" stroke-width="3"/>
  <circle r="17" fill="url(#rg-belt-red)" stroke="#6b4a0c" stroke-width="2"/>
  <path d="M0 -11L3.2 -3.5L11 -3.4L4.8 1.6L7 9.4L0 4.8L-7 9.4L-4.8 1.6L-11 -3.4L-3.2 -3.5Z" fill="#ffe27a"/>
</svg>`;

/**
 * Filippo Pezza's belt, slung across the top right corner of his first
 * card, its leather strap running off the card's top and right edges: it
 * comes slamming down onto the card as the page opens, the card shaking as
 * it lands, then glints now and then (sito.css). Over the text.
 */
function Belt({ children }: { children: ReactNode }) {
  const el = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const host = el.current?.closest<HTMLElement>(".rg-panel");
    if (!host) return;
    const belt = document.createElement("div");
    belt.className = "rg-belt";
    belt.setAttribute("aria-hidden", "true");
    belt.innerHTML = `<div class="rg-belt-strap"></div>${BELT_SIDE}${BELT_SIDE}${BELT_PLATE}`;
    host.append(belt);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => belt.remove();
    // The card takes the blow as the belt lands (its slam, in sito.css, lands about then).
    const t = window.setTimeout(
      () =>
        host.animate(
          [
            { translate: "0 0" },
            { translate: "0 6px" },
            { translate: "-3px -2px" },
            { translate: "2px 1px" },
            { translate: "-1px 0" },
            { translate: "0 0" },
          ],
          { duration: 360, easing: "ease-out" },
        ),
      700,
    );
    return () => {
      window.clearTimeout(t);
      belt.remove();
    };
  }, []);

  return <span ref={el}>{children}</span>;
}

/**
 * A player's name with their easter egg, if they have one: a charge of
 * lightning round it, a mist drifting past, peaches stuck on like stickers,
 * an infection eating the card's edge, or a chat of his messages piling up
 * behind it. On
 * the player's own page in full; `soft` in the standings, fewer and smaller,
 * where the peach is a single one, put after the name by `EasterMark`.
 * Anyone else's name comes back as it is.
 */
export function Easter({ playerId, soft = false, children }: { playerId: number | string; soft?: boolean; children: ReactNode }) {
  const effect = effectOf(playerId);
  // Davide Rapacciuolo's is the words of his whole page (parole.ts), not something on his name.
  // The stickers in the standings are by the name, put there by `EasterMark`.
  if (!effect || effect === "napoletano" || ((effect === "pesca" || effect === "aragosta") && soft)) return <>{children}</>;
  if (effect === "pesca") return <Stickers emoji={PEACH} spots={PEACHES}>{children}</Stickers>;
  if (effect === "aragosta") return <Lobster>{children}</Lobster>;
  if (effect === "copione") return soft ? <CopioneRow>{children}</CopioneRow> : <Copione>{children}</Copione>;
  if (effect === "fulmini") return <Electric soft={soft}>{children}</Electric>;
  if (effect === "fumetto") return <Comic soft={soft}>{children}</Comic>;
  if (effect === "orsetti") return <Bears soft={soft}>{children}</Bears>;
  if (effect === "peek") return <Peek soft={soft}>{children}</Peek>;
  if (effect === "infezione") return <Mold soft={soft}>{children}</Mold>;
  // In the standings his hand is a little one after the name, put there by `EasterMark`.
  if (effect === "ventaglio") return soft ? <>{children}</> : <Fan>{children}</Fan>;
  // In the standings his belt's plate is a little one after the name, put there by `EasterMark`.
  if (effect === "cintura") return soft ? <>{children}</> : <Belt>{children}</Belt>;
  return (
    <Burst effect={effect} soft={soft}>
      {children}
    </Burst>
  );
}

/** The standings' little bunch of peaches, by the name: where each sits in it, its size in em and its tilt. */
const MARK_PEACHES: Spot[] = [
  { x: 0.25, y: 0.62, size: 0.95, tilt: 12 },
  { x: 0.78, y: 0.28, size: 0.62, tilt: -16 },
  { x: 1.12, y: 0.82, size: 0.72, tilt: 24 },
  { x: 0.55, y: -0.1, size: 0.5, tilt: -6 },
];

/**
 * Arturo Precioso's peaches in the standings: a little bunch just after
 * his name, popping on one after another while the row is pointed at
 * (sito.css). Its own element beside the name, not in it: a name cut short
 * with an ellipsis would cut them off too. Lisa Coronini's lobster walking
 * in, Tommaso Cavallini's hand of cards and Filippo Pezza's belt, slung
 * aslant, go there the same way.
 */
export function EasterMark({ playerId }: { playerId: number | string }) {
  const effect = effectOf(playerId);
  if (effect === "ventaglio") return <FanMark />;
  // His belt slung aslant just after his name in the standings.
  if (effect === "cintura")
    return <span aria-hidden="true" className="rg-belt-mark" dangerouslySetInnerHTML={{ __html: `<span class="rg-belt-mark-strap"></span>${BELT_PLATE}` }} />;
  // Her lobster walking in after her name, cut off by the row's edges.
  if (effect === "aragosta")
    return (
      <span aria-hidden="true" className="rg-lobster-mark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOBSTER} alt="" />
      </span>
    );
  if (effect !== "pesca") return null;
  return (
    <span aria-hidden="true" className="rg-peach-mark">
      {MARK_PEACHES.map((p, i) => (
        <span
          key={i}
          className="rg-sticker rg-sticker-inline"
          style={
            {
              left: `${p.x * 100}%`,
              top: `${p.y * 100}%`,
              fontSize: `${p.size}em`,
              "--tilt": `${p.tilt}deg`,
              animationDelay: `${i * 0.09}s`,
            } as CSSProperties
          }
        >
          {PEACH}
        </span>
      ))}
    </span>
  );
}

/** Tommaso Cavallini's hand in the standings: just after his name, cut off by the row's bottom edge, dealt in while the row is pointed at (sito.css). */
function FanMark() {
  return (
    <span aria-hidden="true" className="rg-fan-mark">
      {HAND.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={src}
          alt=""
          className="rg-fan-card"
          style={{ "--turn": `${turnOf(i)}deg`, "--deal": `${i * 0.05}s` } as CSSProperties}
        />
      ))}
    </span>
  );
}
