import { badRequest, proxy } from "@/app/lib/adminRoute";

/**
 * Super admin only; the API answers 403 to everyone else.
 *
 *   GET    /api/admin/admins       → GET    /admin/admins
 *   POST   /api/admin/admins       → POST   /admin/admins
 *   DELETE /api/admin/admins?id=N  → DELETE /admin/admins/N
 */
async function handle(request: Request) {
  let path = "/admin/admins";
  let body: string | undefined;
  if (request.method === "DELETE") {
    const raw = new URL(request.url).searchParams.get("id");
    const id = Number(raw);
    if (!raw || !Number.isSafeInteger(id) || id <= 0) {
      return badRequest({ kind: "bad_request", message: "invalid admin id" });
    }
    path = `/admin/admins/${id}`;
  }
  if (request.method === "POST") {
    try {
      body = JSON.stringify(await request.json());
    } catch {
      return badRequest({ kind: "bad_request", message: "invalid admin body" });
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
export const DELETE = handle;
