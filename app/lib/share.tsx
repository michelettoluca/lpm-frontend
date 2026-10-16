/**
 * How the site's pages look when a link to one is shared: in WhatsApp,
 * Telegram, on a social. Each page gives its own title and a line about it;
 * the images, drawn with next/og (Satori) in the light theme of the site,
 * come from the opengraph-image files beside the pages. Satori lays out with
 * flexbox only: a div holding anything but one string says display: flex.
 */
import type { Metadata } from "next";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";
import { CROWN_PATH, CROWN_VIEWBOX } from "./emblem";

export const SITE = "Lega Pauper Milano";

/**
 * A page's title and line, for the tab and for a shared link alike. A page
 * that sets its own Open Graph replaces the layout's whole, so it's all
 * here: the site's name, the language, the kind of card, and the site's
 * image, unless the page has an opengraph-image of its own (`ownImage`):
 * named here, the site's would win over it.
 */
export function shareMeta(title: string, line: string, path: string, ownImage = false): Metadata {
  const description = line.charAt(0).toUpperCase() + line.slice(1);
  // Left out altogether for a page's own: even an empty one would hide it.
  const images = ownImage ? {} : { images: ["/opengraph-image"] };
  return {
    title,
    description,
    openGraph: { title, description, url: path, siteName: SITE, locale: "it_IT", type: "website", ...images },
    twitter: { card: "summary_large_image", title, description, ...images },
  };
}

/* The shared images: the light theme's colours, as sito.css sets them. */
export const PAPER = "#ffffff";
export const INK = "#141a24";
export const MUTE = "#556072";
export const RED = "#fa1e32";
export const LINE = "#e3e7ed";

/** The size the socials and the messaging apps all take. */
export const SHARE_SIZE = { width: 1200, height: 630 };

export const DISPLAY = { fontFamily: "Archivo", fontWeight: 800, letterSpacing: "-0.035em" } as const;
export const EYEBROW = {
  color: MUTE,
  fontSize: 22,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
} as const;

type Font = { name: string; data: Buffer; weight: 400 | 600 | 700 | 800; style: "normal" };

let fonts: Promise<Font[]> | null = null;

/** The site's fonts, read once from public/fonts: Satori needs the files, not a stylesheet. */
function loadFonts(): Promise<Font[]> {
  fonts ??= Promise.all(
    (
      [
        ["Archivo", 800],
        ["Figtree", 600],
        ["Figtree", 700],
      ] as const
    ).map(async ([name, weight]) => ({
      name,
      weight,
      style: "normal" as const,
      data: await readFile(join(process.cwd(), "public", "fonts", `${name}-${weight}.ttf`)),
    })),
  );
  return fonts;
}

const [, , CROWN_W, CROWN_H] = CROWN_VIEWBOX.split(" ").map(Number);

/** The header's badge: the crown, white on red. */
function Badge({ size }: { size: number }) {
  const h = Math.round(size * 0.58);
  const w = Math.round((h * CROWN_W) / CROWN_H);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.27),
        background: RED,
      }}
    >
      <svg width={w} height={h} viewBox={CROWN_VIEWBOX} style={{ marginBottom: Math.round(size * 0.04) }}>
        <path fill="#fff" fillRule="evenodd" d={CROWN_PATH} />
      </svg>
    </div>
  );
}

/**
 * A shared image: on paper, the badge and the site's name across the top,
 * `aside` at the right of it, the page's own `children` below, a red rule
 * along the foot.
 */
export async function shareImage(children: ReactNode, aside?: ReactNode) {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: "56px 72px 0",
        background: PAPER,
        color: INK,
        fontFamily: "Figtree",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Badge size={64} />
          <div style={{ ...DISPLAY, fontSize: 34 }}>{SITE}</div>
        </div>
        {aside}
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>{children}</div>
      <div style={{ display: "flex", height: 14, margin: "0 -72px", background: RED }} />
    </div>,
    { ...SHARE_SIZE, fonts: await loadFonts() },
  );
}

/** A name or a title as large as fits: smaller the longer its longest line. */
export function fitSize(lines: string[], max: number, width = 1056) {
  const longest = Math.max(1, ...lines.map((l) => l.length));
  return Math.round(Math.min(max, width / (longest * 0.56)));
}
