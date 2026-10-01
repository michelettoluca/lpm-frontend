import { forward } from "@/app/lib/declarationsProxy";

/** Lega Pauper Italia's archetype list. */
export function GET(request: Request) {
  return forward(request, "/archetypes", "GET");
}
