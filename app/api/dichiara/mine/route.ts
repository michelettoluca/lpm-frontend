import { forward } from "@/app/lib/declarationsProxy";

/** The declarations this phone made: `{ receipts: [...] }`. */
export function POST(request: Request) {
  return forward(request, "/declarations/current/mine", "POST");
}
