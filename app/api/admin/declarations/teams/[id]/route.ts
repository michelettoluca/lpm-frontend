import { badRequest, proxy } from "@/app/lib/adminRoute";

async function teamPath(ctx: RouteContext<"/api/admin/declarations/teams/[id]">): Promise<string | null> {
  const { id } = await ctx.params;
  const teamId = Number(id);
  return Number.isSafeInteger(teamId) && teamId > 0 ? `/admin/declarations/teams/${teamId}` : null;
}

/** Set a player's archetype: `{ archetype_id }`. */
export async function PUT(request: Request, ctx: RouteContext<"/api/admin/declarations/teams/[id]">) {
  const path = await teamPath(ctx);
  if (!path) return badRequest({ kind: "bad_request", message: "invalid player" });
  return proxy(request, path, { method: "PUT", body: await request.text(), contentType: "application/json" });
}

/** Remove a player's declaration. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/declarations/teams/[id]">) {
  const path = await teamPath(ctx);
  if (!path) return badRequest({ kind: "bad_request", message: "invalid player" });
  return proxy(request, path, { method: "DELETE" });
}
