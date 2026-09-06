import { badRequest, proxy } from "@/app/lib/adminRoute";

/**
 *   GET    /api/admin/events       → GET    /admin/events
 *   POST   /api/admin/events       → POST   /admin/events
 *   PUT    /api/admin/events?id=N  → PUT    /admin/events/N
 *   DELETE /api/admin/events?id=N  → DELETE /admin/events/N
 */
async function handle(request: Request) {
  const needsId = request.method === "PUT" || request.method === "DELETE";
  const raw = new URL(request.url).searchParams.get("id");
  const id = Number(raw);
  if (needsId && (!raw || !Number.isSafeInteger(id) || id <= 0)) {
    return badRequest({ kind: "bad_request", message: "invalid event id" });
  }

  let body: string | undefined;
  if (request.method === "POST" || request.method === "PUT") {
    try {
      body = JSON.stringify(await request.json());
    } catch {
      return badRequest({ kind: "bad_request", message: "invalid event body" });
    }
  }

  return proxy(request, needsId ? `/admin/events/${id}` : "/admin/events", {
    method: request.method,
    body,
    contentType: body ? "application/json" : undefined,
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
