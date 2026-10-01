import { proxy } from "@/app/lib/adminRoute";

/** Lega Pauper Italia's whole archetype list, blacklisted ones flagged. */
export function GET(request: Request) {
  return proxy(request, "/admin/archetypes", { method: "GET" });
}
