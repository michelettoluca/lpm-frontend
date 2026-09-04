import { importMelee } from "@/app/lib/adminApi";
import { badRequest, toResponse } from "@/app/lib/adminRoute";

/** The API caps the request body at 16 MiB. Reject early rather than upload and fail. */
const MAX_BODY_BYTES = 16 * 1024 * 1024;

export async function POST(request: Request) {
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

  const seasonId = Number(form.get("season_id"));
  if (!Number.isInteger(seasonId) || seasonId <= 0) {
    return badRequest({
      kind: "bad_request",
      message: "pick a season before importing",
      field: "season_id",
    });
  }

  const name = String(form.get("name") ?? "").trim();
  if (!name) {
    return badRequest({
      kind: "bad_request",
      message: "the event needs a name",
      field: "name",
    });
  }

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

  const reset = form.get("reset") === "true";
  if (reset && form.get("confirm") !== "RESET") {
    return badRequest({
      kind: "bad_request",
      message: "destructive request needs confirm=RESET",
      field: "confirm",
    });
  }

  // Rebuild the body: season_id belongs in the query string, not the multipart
  // payload, and only the fields the API expects are forwarded.
  const upstream = new FormData();
  upstream.set("name", name);
  upstream.set("standings", standings, standings.name);
  upstream.set("matches", matches, matches.name);

  const playedAt = String(form.get("played_at") ?? "").trim();
  if (playedAt) upstream.set("played_at", playedAt);

  if (reset) {
    upstream.set("reset", "true");
    upstream.set("confirm", "RESET");
  }

  return toResponse(await importMelee(seasonId, upstream));
}
