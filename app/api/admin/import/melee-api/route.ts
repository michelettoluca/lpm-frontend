import { meleeApiImportPath } from "@/app/lib/adminApi";
import { badRequest, proxy } from "@/app/lib/adminRoute";

/** Import an event's results straight from the Melee API: `{ event_id, tournament_id }`. */
export async function POST(request: Request) {
  let body: { event_id?: unknown; tournament_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return badRequest({ kind: "bad_request", message: "could not read the request" });
  }

  const eventId = Number(body.event_id);
  if (!Number.isSafeInteger(eventId) || eventId <= 0) {
    return badRequest({ kind: "bad_request", message: "pick an event before importing", field: "event_id" });
  }
  const tournamentId = Number(body.tournament_id);
  if (!Number.isSafeInteger(tournamentId) || tournamentId <= 0) {
    return badRequest({
      kind: "bad_request",
      message: "paste the melee.gg tournament link or its number",
      field: "tournament_id",
    });
  }

  return proxy(request, meleeApiImportPath(eventId, tournamentId), { method: "POST" });
}
