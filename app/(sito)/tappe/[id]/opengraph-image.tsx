import { getEventData } from "@/app/lib/site";
import { DISPLAY, EYEBROW, MUTE, RED, SHARE_SIZE, SITE, fitSize, shareImage } from "@/app/lib/share";
import { weekday } from "../../ui";

export const alt = `Una tappa della ${SITE}`;
export const size = SHARE_SIZE;
export const contentType = "image/png";

/** A tappa's shared image: its name and day, and its podium once it's played, or that it's still to come. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await getEventData(id);
  const podium = e?.standings.slice(0, 3) ?? [];
  return shareImage(
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ ...DISPLAY, fontSize: fitSize([e?.title ?? "Tappa"], 140), lineHeight: 0.95 }}>{e?.title ?? "Tappa"}</div>
      {e && e.subtitle !== SITE && e.subtitle !== e.title && (
        <div style={{ display: "flex", marginTop: 14, fontSize: 32, fontWeight: 600, color: MUTE }}>{e.subtitle}</div>
      )}
      {podium.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 34 }}>
          {podium.map((s, i) => (
            <div key={s.player_id} style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
              <div style={{ ...DISPLAY, fontSize: i ? 34 : 46, color: i ? MUTE : RED, width: 64 }}>{`${i + 1}°`}</div>
              <div style={{ ...DISPLAY, fontSize: i ? 34 : 46 }}>{s.player_name}</div>
              <div style={{ fontSize: i ? 24 : 28, fontWeight: 600, color: MUTE }}>{`${s.points} punti`}</div>
            </div>
          ))}
        </div>
      ) : (
        e && <div style={{ display: "flex", marginTop: 34, ...DISPLAY, fontSize: 46, color: RED }}>{e.status}</div>
      )}
    </div>,
    e && <div style={EYEBROW}>{`${weekday(e.event.played_at)} ${e.date}`}</div>,
  );
}
