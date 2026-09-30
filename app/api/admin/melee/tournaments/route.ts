import { meleeTournamentsPath } from "@/app/lib/adminApi";
import { badRequest, proxy } from "@/app/lib/adminRoute";

/** Melee tournaments around an event's day, for the import picker: `?event_id=N`. */
export async function GET(request: Request) {
  const eventId = Number(new URL(request.url).searchParams.get("event_id"));
  if (!Number.isSafeInteger(eventId) || eventId <= 0) {
    return badRequest({ kind: "bad_request", message: "invalid event id", field: "event_id" });
  }
  return proxy(request, meleeTournamentsPath(eventId), { method: "GET" });
}
