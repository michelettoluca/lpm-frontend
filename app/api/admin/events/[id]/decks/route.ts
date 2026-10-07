import { badRequest, proxy } from "@/app/lib/adminRoute";

/** An imported tappa's standings, each with its deck and what the player declared. */
export async function GET(request: Request, ctx: RouteContext<"/api/admin/events/[id]/decks">) {
  const id = Number((await ctx.params).id);
  if (!Number.isSafeInteger(id) || id <= 0) return badRequest({ kind: "bad_request", message: "invalid event id" });
  return proxy(request, `/admin/events/${id}/archetypes`, { method: "GET" });
}
