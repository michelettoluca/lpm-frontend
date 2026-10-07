import { badRequest, proxy } from "@/app/lib/adminRoute";

/** Copy the declared decks onto the tappa: `{ overwrite }`. */
export async function POST(request: Request, ctx: RouteContext<"/api/admin/events/[id]/decks/sync">) {
  const id = Number((await ctx.params).id);
  if (!Number.isSafeInteger(id) || id <= 0) return badRequest({ kind: "bad_request", message: "invalid event id" });
  return proxy(request, `/admin/events/${id}/decks/sync`, { method: "POST", body: await request.text(), contentType: "application/json" });
}
