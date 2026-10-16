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
      host.addEventListener("pointerenter", rain);
      host.addEventListener("pointerleave", end);
      host.addEventListener("pointercancel", end);
      return () => {
        host.removeEventListener("pointerenter", rain);
        host.removeEventListener("pointerleave", end);
        host.removeEventListener("pointercancel", end);
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
      host.addEventListener("pointerenter", start);
      host.addEventListener("pointerleave", end);
      host.addEventListener("pointercancel", end);
      return () => {
        host.removeEventListener("pointerenter", start);
        host.removeEventListener("pointerleave", end);
        host.removeEventListener("pointercancel", end);
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
 * The mushrooms Demetrio Morselli's card grows, after the Fungal Colossus:
 * alien, glowing in the dark, more game than real, and not to be eaten.
 * Drawn upright with the foot of the stem at 0 0, 100 tall, on a dark
 * teal stem: a dome whose rim hooks down into fangs, a tall spire whose tip
 * curls over like a claw, a scalloped bulb; two mean eyes glowing under the
 * caps of the first and the last.
 * The cap, its spots and its gills take their colours from `--rg-cap`,
 * `--rg-spot` and `--rg-gill`; what glows has no ink round it.
 */
const MUSHROOMS = [
  `<path fill="#0d3d48" d="M-10 0C-14-12-12-30-8-44H8C12-30 14-12 10 0Z"/>
  <path class="rg-shroom-glow" fill="#eaff5a" d="M-8-37L-2-34L-3-30L-8-32Z M8-37L2-34L3-30L8-32Z"/>
  <path class="rg-shroom-cap" d="M-44-36C-50-44-50-56-42-66C-30-86 30-86 42-66C50-56 50-44 44-36C40-42 36-44 30-44C20-38 12-46 0-42C-12-46-20-38-30-44C-36-44-40-42-44-36Z"/>
  <path class="rg-shroom-glow rg-shroom-gill" d="M-30-44C-20-38-12-46 0-42C12-46 20-38 30-44C20-49-20-49-30-44Z"/>
  <path class="rg-shroom-glow" fill="#fff" fill-opacity="0.3" d="M-34-60C-30-74-14-80 0-80C-12-75-26-68-34-60Z"/>
  <g class="rg-shroom-glow rg-shroom-spot"><circle cx="-22" cy="-63" r="5"/><circle cx="6" cy="-71" r="5"/><circle cx="25" cy="-61" r="4.5"/><circle cx="-7" cy="-53" r="3"/><circle cx="14" cy="-51" r="2.5"/><circle cx="-38" cy="-50" r="2.5"/></g>`,
  `<path fill="#0d3d48" d="M-6 0C-9-20-4-40-5-56H5C6-40 9-20 6 0Z"/>
  <path class="rg-shroom-cap" d="M-24-54C-20-70-8-84 2-92C10-98 18-96 20-89C14-92 10-90 8-86C14-76 20-66 24-54C12-50-12-50-24-54Z"/>
  <path class="rg-shroom-glow rg-shroom-gill" d="M-20-54C-8-50 8-50 20-54C8-56-8-56-20-54Z"/>
  <path class="rg-shroom-glow" fill="#fff" fill-opacity="0.3" d="M-15-60C-12-70-6-78 0-84C-4-74-9-67-15-60Z"/>
  <g class="rg-shroom-glow rg-shroom-spot"><circle cx="-8" cy="-64" r="3.5"/><circle cx="9" cy="-69" r="3"/><circle cx="1" cy="-79" r="2.5"/><circle cx="15" cy="-58" r="2"/></g>`,
  `<path fill="#0d3d48" d="M-12 0C-14-12-13-26-10-38H10C13-26 14-12 12 0Z"/>
  <path class="rg-shroom-glow" fill="#eaff5a" d="M-8-29L-2-26L-3-22L-8-24Z M8-29L2-26L3-22L8-24Z"/>
  <path class="rg-shroom-cap" d="M-32-36C-38-82 38-82 32-36C24-30 18-38 10-32C4-38-4-38-10-32C-18-38-24-30-32-36Z"/>
  <path class="rg-shroom-glow rg-shroom-gill" d="M-28-36C-22-32-16-38-10-34C-4-38 4-38 10-34C16-38 22-32 28-36C16-41-16-41-28-36Z"/>
  <path class="rg-shroom-glow" fill="#fff" fill-opacity="0.3" d="M-22-50C-20-62-8-68 2-67C-8-63-16-58-22-50Z"/>
  <g class="rg-shroom-glow rg-shroom-spot"><circle cx="-12" cy="-55" r="6.5"/><circle cx="14" cy="-59" r="5.5"/><circle cx="1" cy="-43" r="3"/><circle cx="-25" cy="-44" r="2.5"/><circle cx="25" cy="-45" r="2.5"/></g>`,
];
const MUSHROOM_ODDS = [0.45, 0.75, 1];

/** Their colours, a cap with spots and gills that glow against it: fluo green, teal, electric blue. */
const SHROOM_COLOURS = [
  { cap: "#5cff2e", spot: "#d6fffb", gill: "#7ffff0" },
  { cap: "#14e3c0", spot: "#e6ff6b", gill: "#c3ff6a" },
  { cap: "#1fa8ff", spot: "#d2ff5a", gill: "#6dfff0" },
];

/** A tuft of mushrooms on the card's edge: where round it, when it goes, and where its caps are, for the spores. */
type Tuft = { t: number; el: HTMLElement; until: number; x: number; y: number; dx: number; dy: number; tall: number };

/**
 * A tuft of one to three mushrooms of a kind, sprouting out of the box's
 * edge at `t` (round it from the top left, clockwise) and growing in, stem
 * first, the cap landing with a squash; after `delay`, one after another.
 * Each glows in its colour and sways on its foot, like a game's enemies.
 */
function sprout(layer: HTMLElement, t: number, delay: number, small: boolean): Omit<Tuft, "t" | "until"> {
  const p = round(t, layer.clientWidth, layer.clientHeight, 0);
  // Upright on the bottom edge, upside down on the top, on its side on the others: always growing in.
  const turn = p.ny < 0 ? 180 : p.nx > 0 ? -90 : p.ny > 0 ? 0 : 90;
  const tuft = document.createElement("div");
  tuft.className = "rg-shroom-tuft";
  // Its foot a little past the edge, so it comes up out of it.
  tuft.style.transform = `translate(${p.x + p.nx * 2}px, ${p.y + p.ny * 2}px) rotate(${turn}deg)`;
  const pick = Math.random();
  const kind = MUSHROOMS[MUSHROOM_ODDS.findIndex((o) => pick < o)];
  const colour = SHROOM_COLOURS[Math.floor(Math.random() * SHROOM_COLOURS.length)];
  // Mostly small and middling, now and then a big one; smaller in a narrow card, as on a phone.
  const fit = Math.min(1, Math.max(0.6, layer.clientWidth / 900));
  const tall = small ? between(10, 18) : (24 + Math.random() ** 2 * 52) * fit;
  const side = Math.random() < 0.5 ? -1 : 1;
  const crowd = [{ along: 0, tall }];
  if (Math.random() < 0.45) crowd.push({ along: side * tall * between(0.45, 0.65), tall: tall * between(0.45, 0.7) });
  if (Math.random() < 0.2) crowd.push({ along: -side * tall * between(0.4, 0.55), tall: tall * between(0.35, 0.55) });
  crowd.forEach((m, k) => {
    const el = document.createElement("div");
    el.className = "rg-shroom";
    el.style.left = `${m.along - m.tall / 2}px`;
    el.style.top = `${-m.tall}px`;
    el.style.width = el.style.height = `${m.tall}px`;
    el.style.rotate = `${between(-14, 14) + m.along * 0.4}deg`;
    el.style.setProperty("--rg-cap", colour.cap);
    el.style.setProperty("--rg-spot", colour.spot);
    el.style.setProperty("--rg-gill", colour.gill);
    // Each sways and pulses in its own time.
    el.style.setProperty("--rg-sway", `${between(-1.6, 0).toFixed(2)}s`);
    // Some face the other way.
    const flip = Math.random() < 0.5 ? ' transform="scale(-1 1)"' : "";
    el.innerHTML = `<span class="rg-shroom-aura"></span><svg viewBox="-50 -100 100 102"><g${flip}>${kind}</g></svg>`;
    tuft.append(el);
    el.animate(
      [
        { transform: "scale(0.4, 0)" },
        { transform: "scale(0.85, 1.15)", offset: 0.5 },
        { transform: "scale(1.1, 0.9)", offset: 0.75 },
        { transform: "scale(1)" },
      ],
      { duration: between(520, 720), delay: delay + k * between(80, 160), easing: "ease-out", fill: "backwards" },
    );
  });
  layer.append(tuft);
  return { el: tuft, x: p.x, y: p.y, dx: -p.nx, dy: -p.ny, tall };
}

/**
 * A spore off a tuft's caps, a glowing speck like the Colossus's: it floats
 * on into the card, wavering, and fades.
 */
function spore(layer: HTMLElement, f: Tuft, small: boolean) {
  const el = document.createElement("span");
  el.className = `rg-spore ${Math.random() < 0.3 ? "rg-spore-blue" : ""}`;
  const size = small ? between(1.5, 3) : between(2.5, 5);
  el.style.width = el.style.height = `${size}px`;
  // Off the cap: as far in as the mushroom is tall, a little to one side or the other.
  const sideways = between(-0.4, 0.4) * f.tall;
  const x = f.x + f.dx * f.tall * 0.75 - f.dy * sideways;
  const y = f.y + f.dy * f.tall * 0.75 + f.dx * sideways;
  el.style.left = `${x - size / 2}px`;
  el.style.top = `${y - size / 2}px`;
  layer.append(el);
  const far = (small ? between(10, 24) : between(30, 80)) * (0.6 + f.tall / 80);
  const waver = between(-1, 1) * (small ? 8 : 22);
  el.animate(
    [
      { transform: "translate(0, 0) scale(0.4)", opacity: 0 },
      { opacity: 1, offset: 0.2 },
      { transform: `translate(${f.dx * far * 0.5 - f.dy * waver}px, ${f.dy * far * 0.5 + f.dx * waver}px) scale(1)`, opacity: 0.9, offset: 0.55 },
      { transform: `translate(${f.dx * far + f.dy * waver * 0.5}px, ${f.dy * far - f.dx * waver * 0.5}px) scale(0.6)`, opacity: 0 },
    ],
    { duration: between(1400, 2600), easing: "ease-out" },
  ).finished.finally(() => el.remove());
}

/** A tuft going back into the edge it came out of, then gone. */
function wither(tuft: HTMLElement) {
  for (const el of tuft.children) {
    el.animate([{ transform: "scale(1)" }, { transform: "scale(1.08, 0.9)", offset: 0.3 }, { transform: "scale(0.5, 0)" }], {
      duration: between(300, 420),
      easing: "ease-in",
      fill: "forwards",
    });
  }
  // Gone by then even where the animation is held, as in a hidden tab.
  window.setTimeout(() => tuft.remove(), 450);
}

/**
 * Demetrio Morselli's mushrooms, sprouting all round his first card: as
 * it opens, one tuft after another clockwise from the top left, then tufts
 * going back in here and coming up there, glowing and letting off spores,
 * for as long as it's on screen.
 * Behind its text, clipped by it. `soft`, in the standings, small ones
 * round his row while it's pointed at. Nothing for reduced motion.
 */
function Shrooms({ soft, children }: { soft: boolean; children: ReactNode }) {
  const el = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const name = el.current;
    const host = soft ? name?.closest<HTMLElement>(".rg-row") : name?.closest<HTMLElement>(".rg-panel");
    if (!name || !host || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layer = document.createElement("div");
    layer.className = "rg-shrooms";
    layer.setAttribute("aria-hidden", "true");
    host.classList.add("rg-shrooms-host");
    host.append(layer);

    // How far apart tufts keep at least, and off the rounded corners, in px.
    const gap = soft ? 56 : 66;
    const corner = soft ? 14 : 40;
    let tufts: Tuft[] = [];
    let timer: number | null = null;

    const fits = (t: number) => {
      const w = layer.clientWidth;
      const h = layer.clientHeight;
      const p = round(t, w, h, 0);
      const clear = p.ny ? p.x > corner && p.x < w - corner : p.y > corner && p.y < h - corner;
      const apart = gap / (2 * (w + h));
      return clear && tufts.every((f) => Math.min(Math.abs(f.t - t), 1 - Math.abs(f.t - t)) > apart);
    };
    // About as many as fit with room to come and go.
    const wanted = () => Math.round(((2 * (layer.clientWidth + layer.clientHeight)) / gap) * 0.75);
    const life = () => (soft ? between(1800, 4000) : between(2500, 6500));

    const grow = (t: number, delay: number) =>
      tufts.push({ t, ...sprout(layer, t, delay, soft), until: performance.now() + delay + life() });
    // As it opens: once round, from the top left, clockwise.
    const ring = () => {
      const n = wanted();
      const time = soft ? 500 : 1600;
      for (let i = 0; i < n; i++) {
        const t = ((i + between(-0.3, 0.3)) / n + 1) % 1;
        if (fits(t)) grow(t, (i / n) * time);
      }
    };
    // Then the ones whose time is up go back in, and new ones come up where there's room.
    const tick = () => {
      if (document.hidden) return;
      const now = performance.now();
      tufts = tufts.filter((f) => f.until > now || (wither(f.el), false));
      // A spore or two off the caps, now and then.
      for (const f of tufts) if (Math.random() < (soft ? 0.05 : 0.07)) spore(layer, f, soft);
      if (tufts.length >= wanted() || Math.random() < 0.4) return;
      for (let k = 0; k < 10; k++) {
        const t = Math.random();
        if (fits(t)) return void grow(t, 0);
      }
    };
    const start = () => {
      if (timer !== null) return;
      if (!tufts.length) ring();
      timer = window.setInterval(tick, 220);
    };
    const stop = () => {
      if (timer !== null) window.clearInterval(timer);
      timer = null;
    };
    const cleanup = () => {
      stop();
      layer.remove();
    };

    if (soft) {
      const end = () => {
        stop();
        tufts.forEach((f) => wither(f.el));
        tufts = [];
      };
      host.addEventListener("pointerenter", start);
      host.addEventListener("pointerleave", end);
      host.addEventListener("pointercancel", end);
      return () => {
        host.removeEventListener("pointerenter", start);
        host.removeEventListener("pointerleave", end);
        host.removeEventListener("pointercancel", end);
        cleanup();
      };
    }
    const seen = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
    // A moment after the page opens, so the card is there to grow out of.
    const t = window.setTimeout(() => seen.observe(host), 300);
    return () => {
      window.clearTimeout(t);
      seen.disconnect();
      cleanup();
    };
  }, [soft]);

  return <span ref={el}>{children}</span>;
}

/**
 * A player's name with their easter egg, if they have one: a charge of
 * lightning round it, a mist drifting past, peaches stuck on like stickers,
 * mushrooms sprouting round the card, or a chat of his messages piling up
 * behind it. On
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
  if (effect === "orsetti") return <Bears soft={soft}>{children}</Bears>;
  if (effect === "peek") return <Peek soft={soft}>{children}</Peek>;
  if (effect === "funghi") return <Shrooms soft={soft}>{children}</Shrooms>;
  return (
    <Burst effect={effect} soft={soft}>
      {children}
    </Burst>
  );
}

/** The standings' little bunch of peaches, by the name: where each sits in it, its size in em and its tilt. */
const MARK_PEACHES = [
  { x: 0.25, y: 0.62, size: 0.95, tilt: 12 },
  { x: 0.78, y: 0.28, size: 0.62, tilt: -16 },
  { x: 1.12, y: 0.82, size: 0.72, tilt: 24 },
  { x: 0.55, y: -0.1, size: 0.5, tilt: -6 },
];

/**
 * Arturo Precioso's peaches in the standings: a little bunch just after
 * his name, popping on one after another while the row is pointed at
 * (sito.css). Its own element beside the name, not in it: a name cut short
 * with an ellipsis would cut them off too.
 */
export function EasterMark({ playerId }: { playerId: number | string }) {
  if (effectOf(playerId) !== "pesca") return null;
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
