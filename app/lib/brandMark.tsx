import { ImageResponse } from "next/og";
import { CROWN_PATH, CROWN_VIEWBOX } from "./emblem";

/* The header's badge: the emblem's crown, white on the LPM red. Here the
   crown fills more of the square than in the header, to read at 16px. */
const RED = "#fa1e32";
const [, , W, H] = CROWN_VIEWBOX.split(" ").map(Number);

export function brandMark(px: number, opts: { radius: number }) {
  const height = Math.round(px * 0.62);
  const width = Math.round((height * W) / H);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: RED,
        borderRadius: opts.radius,
      }}
    >
      {/* Lifted a touch: the spires are thin, the base is heavy. */}
      <svg width={width} height={height} viewBox={CROWN_VIEWBOX} style={{ marginBottom: Math.round(px * 0.04) }}>
        <path fill="#fff" fillRule="evenodd" d={CROWN_PATH} />
      </svg>
    </div>,
    { width: px, height: px },
  );
}
