import { proxy } from "@/app/lib/adminRoute";

/** Melee tournaments around today that declarations can be opened for. */
export function GET(request: Request) {
  return proxy(request, "/admin/declarations/tournaments", { method: "GET" });
}
