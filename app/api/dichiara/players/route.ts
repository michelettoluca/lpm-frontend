import { forward } from "@/app/lib/declarationsProxy";

/** The registered players whose name matches `?q=`, while players find themselves by name. */
export function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  return forward(request, `/declarations/current/players?q=${encodeURIComponent(q)}`, "GET");
}
