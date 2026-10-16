import { getActiveSeason } from "./lib/api";
import { DISPLAY, EYEBROW, MUTE, SHARE_SIZE, SITE, shareImage } from "./lib/share";

export const alt = SITE;
export const size = SHARE_SIZE;
export const contentType = "image/png";

/** The site's shared image, for every page without its own: its name, large, and the season under way. */
export default async function Image() {
  const season = await getActiveSeason();
  return shareImage(
    <div style={{ display: "flex", flexDirection: "column" }}>
      {season && <div style={EYEBROW}>{`stagione ${season.name.toLowerCase()}`}</div>}
      <div style={{ display: "flex", flexDirection: "column", ...DISPLAY, fontSize: 132, lineHeight: 0.95, marginTop: 18 }}>
        <div>Lega Pauper</div>
        <div>Milano</div>
      </div>
      <div style={{ display: "flex", marginTop: 26, fontSize: 30, fontWeight: 600, color: MUTE }}>
        La lega Pauper di Milano: tappe, classifica, mazzi.
      </div>
    </div>,
  );
}
