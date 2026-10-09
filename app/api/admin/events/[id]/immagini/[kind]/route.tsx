import { getEventData } from "@/app/lib/site";
import { cached, fingerprint, remember } from "../cache";
import { drawImage } from "../draw";
import { shareImages } from "../kinds";
import { requireAdmin } from "../session";

/** A tappa's image for WhatsApp, as PNG: classifica, mazzi or imbattuti. Admins only. */
export async function GET(request: Request, ctx: RouteContext<"/api/admin/events/[id]/immagini/[kind]">) {
  const refused = await requireAdmin(request);
  if (refused) return refused;
  const { id, kind } = await ctx.params;
  const e = await getEventData(id);
  const image = e && shareImages(e).find((img) => img.kind === kind);
  if (!e || !image) return new Response("Not found", { status: 404 });

  const key = `${e.event.id}:${image.kind}:${fingerprint(e)}`;
  let png = cached(key);
  if (!png) {
    const drawn = await drawImage(e, image.kind);
    if (!drawn) return new Response("Not found", { status: 404 });
    png = Buffer.from(await drawn.arrayBuffer());
    remember(key, png);
  }
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="${image.file}"`,
      // For the signed-in admin only: never a shared cache.
      "Cache-Control": "private, max-age=60",
    },
  });
}
