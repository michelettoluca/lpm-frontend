import { forward } from "@/app/lib/declarationsProxy";

/** Archetypes a search most likely means, from Jev: `{ text }`. */
export function POST(request: Request) {
  return forward(request, "/archetypes/suggest", "POST");
}
