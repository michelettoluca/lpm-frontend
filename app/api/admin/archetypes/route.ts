import { proxy } from "@/app/lib/adminRoute";

/** An archetype for each on Lega Pauper Italia's list, with our details; hidden ones flagged. */
export function GET(request: Request) {
  return proxy(request, "/admin/archetypes", { method: "GET" });
}
