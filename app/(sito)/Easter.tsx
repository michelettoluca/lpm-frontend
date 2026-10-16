"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { effectOf } from "@/app/lib/easter";
import { COPIONE, type Battuta } from "./copione";

/* Diego's bolts: his logo, an orange bolt beside a white one, traced from
   the picture into a 338 by 580 box. */
const BOLT_ORANGE =
  "M39 34 41 35 41 44 22 208 34 212 72 216 76 217 77 220 41 317 40 327 45 328 87 317 91 317 93 323 73 513 71 513 73 343 66 342 13 354 9 354 7 351 47 241 47 236 44 234 6 231 0 227Z";
const BOLT_WHITE =
  "M26 0 229 30 227 36 200 57 164 90 236 106 238 110 157 211 94 247 92 247 94 242 169 142 176 132 176 128 91 113 91 108 147 60 151 53ZM332 204 338 204 336 207 188 254 178 259 157 343 158 346 279 325 286 325 286 327 150 392 68 580 143 271 143 268 97 268 97 266 163 226Z";

const between = (a: number, b: number) => a + Math.random() * (b - a);

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

/** One of his bolts, flung out of the name from a point on its box, spinning, flashing and gone. */
function spark(box: DOMRect, scale = 1) {
  const into = layer();
  if (!into) return;
  // Wide enough for the logo to read, a little over half as wide as tall.
  const size = between(22, 40) * scale;
  // Somewhere on the name, a little past its edges, thrown away from its middle.
  const x = between(box.left - 6, box.right + 6);
  const y = between(box.top - 4, box.bottom + 4);
  const away = Math.atan2(y - (box.top + box.height / 2), x - (box.left + box.width / 2)) + between(-0.6, 0.6);
  const far = between(18, 42) * scale;
  const tilt = between(-35, 35);
  const spin = between(-50, 50);

  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 338 580");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String((size * 580) / 338));
  svg.classList.add("rg-spark");
  svg.style.left = `${x - size / 2}px`;
  svg.style.top = `${y - size}px`;
  for (const [d, part] of [
    [BOLT_ORANGE, "rg-spark-orange"],
    [BOLT_WHITE, "rg-spark-white"],
  ]) {
    const path = document.createElementNS(SVG, "path");
    path.setAttribute("d", d);
    path.setAttribute("class", part);
    svg.append(path);
  }
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

/**
 * A player's name with their easter egg, if they have one: bolts thrown out
 * like sparks, a mist drifting past, peaches stuck on like stickers, or a
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
