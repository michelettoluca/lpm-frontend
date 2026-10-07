"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Development only: tries other fonts on the live site, one picker for the
 * display font (headings and big numbers, Fraunces) and one for the text
 * (Instrument Sans). The layout renders it only under `next dev`, so
 * production never ships it; the alternatives load from Google Fonts on first
 * pick.
 */
type Font = {
  id: string;
  label: string;
  /** The CSS family; none for the site's own font. */
  family?: string;
  /** The Google Fonts stylesheet, unless the page already loads the font. */
  href?: string;
  /** For the display font: the weight, tracking and width it looks best at in the headings. */
  weight?: number;
  tracking?: string;
  stretch?: string;
};

const google = (family: string) => `https://fonts.googleapis.com/css2?family=${family}&display=swap`;

const DISPLAY: Font[] = [
  { id: "fraunces", label: "Fraunces (attuale)" },
  // Already loaded, for the admin.
  { id: "archivo", label: "Archivo", family: "var(--font-archivo)", weight: 700, tracking: "-0.03em" },
  {
    id: "archivo-expanded",
    label: "Archivo Expanded",
    family: '"Archivo"',
    href: google("Archivo:wdth,wght@62..125,100..900"),
    weight: 700,
    tracking: "-0.035em",
    stretch: "125%",
  },
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
  {
    id: "instrument",
    label: "Instrument Sans",
    family: '"Instrument Sans"',
    href: google("Instrument+Sans:wght@400..700"),
    weight: 600,
    tracking: "-0.03em",
  },
];

const TEXT: Font[] = [
  { id: "instrument", label: "Instrument Sans (attuale)" },
  // Already loaded, for the admin.
  { id: "archivo", label: "Archivo", family: "var(--font-archivo)" },
  { id: "inter", label: "Inter", family: '"Inter"', href: google("Inter:opsz,wght@14..32,300..700") },
  { id: "geist", label: "Geist", family: '"Geist"', href: google("Geist:wght@300..700") },
  { id: "dm", label: "DM Sans", family: '"DM Sans"', href: google("DM+Sans:opsz,wght@9..40,300..700") },
  { id: "figtree", label: "Figtree", family: '"Figtree"', href: google("Figtree:wght@300..800") },
  { id: "manrope", label: "Manrope", family: '"Manrope"', href: google("Manrope:wght@300..800") },
  { id: "onest", label: "Onest", family: '"Onest"', href: google("Onest:wght@300..700") },
  { id: "public", label: "Public Sans", family: '"Public Sans"', href: google("Public+Sans:wght@300..700") },
];

/** Each picker: where it remembers the pick, and the rules that apply a font. */
const PICKERS = {
  display: {
    label: "titoli",
    key: "lpm-dev-font",
    fonts: DISPLAY,
    // :root raises the rules above the class next/font sets the variable with.
    css: (f: Font) => `:root .lpm { --font-rg-display: ${f.family}; }
:root .lpm .rg-display { font-weight: ${f.weight}; letter-spacing: ${f.tracking}; font-stretch: ${f.stretch ?? "normal"}; }
:root .lpm .rg-display.rg-strong { font-weight: ${Math.min((f.weight ?? 400) + 100, 800)}; }`,
  },
  text: {
    label: "testo",
    key: "lpm-dev-font-text",
    fonts: TEXT,
    css: (f: Font) => `:root .lpm { --font-rg-text: ${f.family}; }`,
  },
} as const;
type Picker = keyof typeof PICKERS;

const chosen: Record<Picker, string | null> = { display: null, text: null };
const listeners = new Set<() => void>();

function read(picker: Picker): string {
  const { key, fonts } = PICKERS[picker];
  if (chosen[picker]) return chosen[picker];
  try {
    const v = localStorage.getItem(key);
    return fonts.some((f) => f.id === v) ? v! : fonts[0].id;
  } catch {
    return fonts[0].id;
  }
}

function write(picker: Picker, id: string) {
  chosen[picker] = id;
  try {
    localStorage.setItem(PICKERS[picker].key, id);
  } catch {
    // Blocked storage: the pick still holds for this visit.
  }
  listeners.forEach((l) => l());
}

function usePick(picker: Picker): string {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => read(picker),
    () => PICKERS[picker].fonts[0].id,
  );
}

/** Loads the picked font and points the site at it; the site's own font needs nothing. */
function apply(picker: Picker, id: string) {
  const { fonts, css } = PICKERS[picker];
  const font = fonts.find((f) => f.id === id);
  const styleId = `rg-dev-font-${picker}`;
  let style = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!font?.family) {
    style?.remove();
    return;
  }
  if (font.href && !document.querySelector(`link[href="${font.href}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = font.href;
    document.head.appendChild(link);
  }
  if (!style) {
    style = document.createElement("style");
    style.id = styleId;
    document.head.appendChild(style);
  }
  style.textContent = css(font);
}

function Select({ picker }: { picker: Picker }) {
  const id = usePick(picker);
  useEffect(() => apply(picker, id), [picker, id]);
  const { label, fonts } = PICKERS[picker];
  return (
    <label className="flex items-center gap-1.5">
      <span className="font-semibold">{label}</span>
      <select
        value={id}
        onChange={(e) => write(picker, e.target.value)}
        className="max-w-[9.5rem] rounded-full bg-transparent px-1 py-1"
      >
        {fonts.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FontSwitch() {
  return (
    <div className="rg-devfont fixed bottom-3 left-3 z-50 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[22px] py-1.5 pr-2 pl-3.5 text-[13px]">
      <Select picker="display" />
      <Select picker="text" />
      <span className="rg-muted">dev</span>
    </div>
  );
}
