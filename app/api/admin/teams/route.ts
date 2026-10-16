import { badRequest, proxy } from "@/app/lib/adminRoute";

/**
 * Super admin only; the API answers 403 to everyone else.
 *
 *   GET    /api/admin/teams                → GET    /admin/teams
 *   POST   /api/admin/teams                → POST   /admin/teams
 *   PUT    /api/admin/teams?id=N           → PUT    /admin/teams/N
 *   PUT    /api/admin/teams?id=N&players   → PUT    /admin/teams/N/players
 *   DELETE /api/admin/teams?id=N           → DELETE /admin/teams/N
 */
async function handle(request: Request) {
  const params = new URL(request.url).searchParams;
  let path = "/admin/teams";
  if (request.method === "PUT" || request.method === "DELETE") {
    const raw = params.get("id");
    const id = Number(raw);
    if (!raw || !Number.isSafeInteger(id) || id <= 0) {
      return badRequest({ kind: "bad_request", message: "invalid team id" });
    }
    path = `/admin/teams/${id}${request.method === "PUT" && params.has("players") ? "/players" : ""}`;
  }
  let body: string | undefined;
  if (request.method === "POST" || request.method === "PUT") {
    try {
      body = JSON.stringify(await request.json());
    } catch {
      return badRequest({ kind: "bad_request", message: "invalid team body" });
    }
  }
  return proxy(request, path, {
    method: request.method,
    body,
    contentType: body ? "application/json" : undefined,
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
