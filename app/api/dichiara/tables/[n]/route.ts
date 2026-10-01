import { forward } from "@/app/lib/declarationsProxy";

/** The players at one table of the current round; table 0 lists the byes. */
export async function GET(request: Request, ctx: RouteContext<"/api/dichiara/tables/[n]">) {
  const { n } = await ctx.params;
  const table = Number(n);
  if (!Number.isSafeInteger(table) || table < 0) {
    return Response.json({ error: "invalid table number" }, { status: 400 });
  }
  return forward(request, `/declarations/current/tables/${table}`, "GET");
}
