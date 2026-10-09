import { getEventData } from "@/app/lib/site";
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
  return (await drawImage(e, image.kind, image.file)) ?? new Response("Not found", { status: 404 });
}
