import { badRequest, proxy } from "@/app/lib/adminRoute";

/**
 *   GET    /api/admin/seasons                  → GET    /admin/seasons
 *   POST   /api/admin/seasons                  → POST   /admin/seasons
 *   PUT    /api/admin/seasons?id=N             → PUT    /admin/seasons/N
 *   PUT    /api/admin/seasons?id=N&active=true → PUT    /admin/seasons/N/active
 *   DELETE /api/admin/seasons?id=N             → DELETE /admin/seasons/N
 */
function parseId(value: string | null): number | null {
  const id = Number(value);
  return value && Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function handle(request: Request) {
  const query = new URL(request.url).searchParams;
  const needsId = request.method === "PUT" || request.method === "DELETE";
  const id = parseId(query.get("id"));
  if (needsId && id === null) {
    return badRequest({ kind: "bad_request", message: "invalid season id" });
  }
  const activate = request.method === "PUT" && query.get("active") === "true";

  let body: string | undefined;
  if (request.method === "POST" || (request.method === "PUT" && !activate)) {
    try {
      body = JSON.stringify(await request.json());
    } catch {
      return badRequest({ kind: "bad_request", message: "invalid season body" });
    }
  }

  const path = needsId ? `/admin/seasons/${id}${activate ? "/active" : ""}` : "/admin/seasons";
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
