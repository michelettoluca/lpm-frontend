import { importMelee } from "@/app/lib/adminApi";
import { badRequest, missingKey, readKey, toResponse } from "@/app/lib/adminRoute";

/** The API caps the request body at 16 MiB. Reject early rather than upload and fail. */
const MAX_BODY_BYTES = 16 * 1024 * 1024;

export async function POST(request: Request) {
  const apiKey = readKey(request);
  if (!apiKey) return missingKey();

  const declaredSize = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_BODY_BYTES) {
    return badRequest({
      kind: "bad_request",
      message:
        "the two files add up to more than 16 MB, which is far larger than a melee export — check you picked the right CSVs",
      field: "standings",
    });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest({
      kind: "bad_request",
      message: "could not read the uploaded form",
    });
  }

  const eventId = Number(form.get("event_id"));
  if (!Number.isSafeInteger(eventId) || eventId <= 0) return badRequest({kind:"bad_request", message:"pick an event before importing", field:"event_id"});

  const standings = form.get("standings");
  const matches = form.get("matches");
  if (!(standings instanceof File) || standings.size === 0) {
    return badRequest({
      kind: "bad_request",
      message: "choose the Standings-tournament-….csv file",
      field: "standings",
    });
  }
  if (!(matches instanceof File) || matches.size === 0) {
    return badRequest({
      kind: "bad_request",
      message: "choose the Matches-tournament-….csv file",
      field: "matches",
    });
  }

  const upstream = new FormData();
  upstream.set("standings", standings, standings.name);
  upstream.set("matches", matches, matches.name);
  return toResponse(await importMelee(apiKey, eventId, upstream));
}
