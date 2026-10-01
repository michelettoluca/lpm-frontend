import { proxy } from "@/app/lib/adminRoute";

/** The latest tournament's pairings, roster and declarations. */
export function GET(request: Request) {
  return proxy(request, "/admin/declarations", { method: "GET" });
}
