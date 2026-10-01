import { proxy } from "@/app/lib/adminRoute";

/** Open declarations for a Melee tournament: `{ tournament_id }`. */
export async function POST(request: Request) {
  return proxy(request, "/admin/declarations/open", {
    method: "POST",
    body: await request.text(),
    contentType: "application/json",
  });
}
