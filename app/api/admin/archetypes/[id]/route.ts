import { badRequest, proxy } from "@/app/lib/adminRoute";

/** Hide an archetype from players or show it again: `{ hidden }`. */
export async function PUT(request: Request, ctx: RouteContext<"/api/admin/archetypes/[id]">) {
  const { id } = await ctx.params;
  const archetypeId = Number(id);
  if (!Number.isSafeInteger(archetypeId) || archetypeId <= 0) {
    return badRequest({ kind: "bad_request", message: "invalid archetype" });
  }
  return proxy(request, `/admin/archetypes/${archetypeId}/hidden`, {
    method: "PUT",
    body: await request.text(),
    contentType: "application/json",
  });
}
