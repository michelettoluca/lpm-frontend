import { badRequest, proxy } from "@/app/lib/adminRoute";

/** Set a player's deck at the tappa: `{ archetype_id }`, null to remove it. */
export async function PUT(request: Request, ctx: RouteContext<"/api/admin/events/[id]/decks/[playerId]">) {
  const { id, playerId } = await ctx.params;
  const eventId = Number(id);
  const player = Number(playerId);
  if (!Number.isSafeInteger(eventId) || eventId <= 0 || !Number.isSafeInteger(player) || player <= 0) {
    return badRequest({ kind: "bad_request", message: "invalid event or player" });
  }
  return proxy(request, `/admin/events/${eventId}/decks/${player}`, {
    method: "PUT",
    body: await request.text(),
    contentType: "application/json",
  });
}
