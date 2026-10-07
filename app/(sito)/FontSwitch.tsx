"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Development only: tries other display fonts on the live site in place of
 * Fraunces. The layout renders it only under `next dev`, so production never
 * ships it; the alternatives load from Google Fonts on first pick. Each comes
 * with the weight and tracking it looks best at in the headings.
 */
const google = (family: string) => `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
const FONTS = [
  { id: "fraunces", label: "Fraunces (attuale)" },
  {
    id: "bricolage",
    label: "Bricolage Grotesque",
    family: '"Bricolage Grotesque"',
    href: google("Bricolage+Grotesque:opsz,wght@12..96,300..800"),
    weight: 500,
    tracking: "-0.025em",
  },
  {
    id: "space",
    label: "Space Grotesk",
    family: '"Space Grotesk"',
    href: google("Space+Grotesk:wght@300..700"),
    weight: 500,
    tracking: "-0.03em",
  },
  {
    id: "unbounded",
    label: "Unbounded",
    family: '"Unbounded"',
    href: google("Unbounded:wght@300..800"),
    weight: 500,
    tracking: "-0.035em",
  },
  { id: "sora", label: "Sora", family: '"Sora"', href: google("Sora:wght@300..800"), weight: 500, tracking: "-0.03em" },
  { id: "syne", label: "Syne", family: '"Syne"', href: google("Syne:wght@400..800"), weight: 600, tracking: "-0.02em" },
  {
    id: "outfit",
    label: "Outfit",
    family: '"Outfit"',
    href: google("Outfit:wght@300..800"),
    weight: 500,
    tracking: "-0.02em",
  },
  {
    id: "jakarta",
    label: "Plus Jakarta Sans",
    family: '"Plus Jakarta Sans"',
    href: google("Plus+Jakarta+Sans:wght@300..800"),
    weight: 600,
    tracking: "-0.035em",
  },
  {
    id: "shoulders",
    label: "Big Shoulders Display",
    family: '"Big Shoulders Display"',
    href: google("Big+Shoulders+Display:wght@400..900"),
    weight: 700,
    tracking: "0em",
  },
  // Already loaded: the admin's font, and the site's body font.
  { id: "archivo", label: "Archivo", family: "var(--font-archivo)", weight: 700, tracking: "-0.03em" },
  { id: "instrument", label: "Instrument Sans", family: "var(--font-rg-text)", weight: 600, tracking: "-0.03em" },
] as const satisfies readonly {
  id: string;
  label: string;
  family?: string;
  href?: string;
  weight?: number;
  tracking?: string;
}[];
type FontId = (typeof FONTS)[number]["id"];

const KEY = "lpm-dev-font";
let chosen: FontId | null = null;
const listeners = new Set<() => void>();

function readFont(): FontId {
  if (chosen) return chosen;
  try {
    const v = localStorage.getItem(KEY);
    return FONTS.some((f) => f.id === v) ? (v as FontId) : "fraunces";
  } catch {
    return "fraunces";
  }
}

function writeFont(id: FontId) {
  chosen = id;
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // Blocked storage: the pick still holds for this visit.
  }
  listeners.forEach((l) => l());
}

function useFont(): FontId {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    readFont,
    () => "fraunces",
  );
}

/** Points the site's display font at the picked family, with its weight and tracking. */
function applyFont(id: FontId) {
  const font = FONTS.find((f) => f.id === id);
  let style = document.getElementById("rg-dev-font") as HTMLStyleElement | null;
  if (!font || !("family" in font)) {
    style?.remove();
    return;
  }
  if ("href" in font && !document.querySelector(`link[href="${font.href}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = font.href;
    document.head.appendChild(link);
  }
  if (!style) {
    style = document.createElement("style");
    style.id = "rg-dev-font";
    document.head.appendChild(style);
  }
  // :root raises the rules above the class next/font sets the variable with.
  style.textContent = `:root .lpm { --font-rg-display: ${font.family}; }
:root .lpm .rg-display { font-weight: ${font.weight}; letter-spacing: ${font.tracking}; }
:root .lpm .rg-display.rg-strong { font-weight: ${Math.min(font.weight + 100, 800)}; }`;
}

export function FontSwitch() {
  const font = useFont();
  useEffect(() => applyFont(font), [font]);

  return (
    <label className="rg-devfont fixed bottom-3 left-3 z-50 flex items-center gap-2 rounded-full py-1.5 pr-2 pl-3.5 text-[13px]">
      <span className="font-semibold">font</span>
      <select
        value={font}
        onChange={(e) => writeFont(e.target.value as FontId)}
        className="rounded-full bg-transparent px-1 py-1"
      >
        {FONTS.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label}
          </option>
        ))}
      </select>
      <span className="rg-muted">dev</span>
    </label>
  );
}
