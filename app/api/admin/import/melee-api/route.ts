import { meleeApiImportPath } from "@/app/lib/adminApi";
import { badRequest, proxy } from "@/app/lib/adminRoute";

/** Import a tappa's results from the Melee tournament it is played as: `{ event_id }`. */
export async function POST(request: Request) {
  let body: { event_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return badRequest({ kind: "bad_request", message: "could not read the request" });
  }

  const eventId = Number(body.event_id);
  if (!Number.isSafeInteger(eventId) || eventId <= 0) {
    return badRequest({ kind: "bad_request", message: "pick an event before importing", field: "event_id" });
  }

  return proxy(request, meleeApiImportPath(eventId), { method: "POST" });
}
