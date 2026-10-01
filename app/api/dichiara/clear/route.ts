import { forward } from "@/app/lib/declarationsProxy";

/** Withdraw a declaration this phone made: `{ receipt }`. */
export function POST(request: Request) {
  return forward(request, "/declarations/current/clear", "POST");
}
