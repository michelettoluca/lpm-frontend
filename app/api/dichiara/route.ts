import { forward } from "@/app/lib/declarationsProxy";

/** The tournament taking declarations and its current round. */
export function GET(request: Request) {
  return forward(request, "/declarations/current", "GET");
}

/** Declare a deck: `{ table, team_id, archetype_id }`. */
export function POST(request: Request) {
  return forward(request, "/declarations/current", "POST");
}
