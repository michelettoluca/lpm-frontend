import { resetDatabase } from "@/app/lib/adminApi";
import { badRequest, missingKey, readKey, toResponse } from "@/app/lib/adminRoute";

export async function POST(request: Request) {
  const apiKey = readKey(request);
  if (!apiKey) return missingKey();

  let body: { confirm?: unknown; include_seasons?: unknown };
  try {
    body = await request.json();
  } catch {
    return badRequest({ kind: "bad_request", message: "malformed request body" });
  }

  // The typed confirmation is enforced here as well as by the API, so a
  // mis-wired client can never reach the destructive endpoint.
  if (body.confirm !== "RESET") {
    return badRequest({
      kind: "bad_request",
      message: "destructive request needs confirm=RESET",
      field: "confirm",
    });
  }

  return toResponse(await resetDatabase(apiKey, body.include_seasons === true));
}
