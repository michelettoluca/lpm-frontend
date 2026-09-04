import { createSeason } from "@/app/lib/adminApi";
import { badRequest, toResponse } from "@/app/lib/adminRoute";

export async function POST(request: Request) {
  let name: unknown;
  try {
    const body: unknown = await request.json();
    name = (body as { name?: unknown })?.name;
  } catch {
    return badRequest({ kind: "bad_request", message: "malformed request body" });
  }

  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) {
    return badRequest({
      kind: "bad_request",
      message: "missing name",
      field: "name",
    });
  }

  return toResponse(await createSeason(trimmed));
}
