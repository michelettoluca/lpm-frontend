import { getPlayerData } from "@/app/lib/site";
import { DISPLAY, EYEBROW, LINE, MUTE, RED, SHARE_SIZE, SITE, fitSize, shareImage } from "@/app/lib/share";

export const alt = `Un giocatore della ${SITE}`;
export const size = SHARE_SIZE;
export const contentType = "image/png";

function Stat({ label, value, red = false }: { label: string; value: string; red?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 22, fontWeight: 600, color: MUTE }}>{label}</div>
      <div style={{ ...DISPLAY, fontSize: 64, lineHeight: 1, color: red ? RED : undefined }}>{value}</div>
    </div>
  );
}

/** A player's shared image: their name, as large as fits, and their season in four numbers, as on their page. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getPlayerData(id);
  const lines = p ? [p.first, p.last].filter(Boolean) : ["Giocatore"];
  return shareImage(
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", flexDirection: "column", ...DISPLAY, fontSize: fitSize(lines, 120), lineHeight: 0.95 }}>
        {lines.map((l) => (
          <div key={l}>{l}</div>
        ))}
      </div>
      {p && (
        <div style={{ display: "flex", gap: 64, marginTop: 34, paddingTop: 26, borderTop: `2px solid ${LINE}` }}>
          <Stat label="posizione" value={p.rank ? `${p.rank}°` : "–"} red={p.rank === 1} />
          <Stat label="punti" value={String(p.points)} />
          <Stat label="vinte · perse · patte" value={`${p.wins}-${p.losses}-${p.draws}`} />
          <Stat label="match vinti" value={p.winPct} />
        </div>
      )}
    </div>,
    p?.season && <div style={EYEBROW}>{`stagione ${p.season.name.toLowerCase()}`}</div>,
  );
}
