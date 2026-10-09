import { getEventData } from "@/app/lib/site";
import { shareImages } from "./kinds";
import { requireAdmin } from "./session";

/** The images a tappa has to share, for the admin's page: empty before the results are in. */
export async function GET(request: Request, ctx: RouteContext<"/api/admin/events/[id]/immagini">) {
  const refused = await requireAdmin(request);
  if (refused) return refused;
  const e = await getEventData((await ctx.params).id);
  return Response.json(e ? shareImages(e) : []);
}
