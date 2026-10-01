import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/* The header wordmark: Fraunces 500 with soft corners, white on the LPM red.
   The font file is a static instance (SOFT 100, WONK 0, opsz 144) cut down to
   L, P and M, since the icon renderer can't read variable fonts. */
const RED = "#fa1e32";

export async function brandMark(px: number, opts: { radius: number }) {
  const font = await readFile(join(process.cwd(), "app/fraunces-lpm.woff"));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: RED,
          borderRadius: opts.radius,
          color: "#fff",
          fontFamily: "Fraunces",
          fontSize: Math.round(px * 0.46),
          letterSpacing: "-0.025em",
          lineHeight: 1,
        }}
      >
        LPM
      </div>
    ),
    {
      width: px,
      height: px,
      fonts: [{ name: "Fraunces", data: font, weight: 500, style: "normal" }],
    },
  );
}
