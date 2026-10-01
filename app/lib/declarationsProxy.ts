/**
 * Server-side pass-through for the public deck declaration endpoints. They
 * need no session; the API is only reached from here because it ships no CORS.
 */

// LPM_API_BASE points a local dev server at a local backend.
const BASE = process.env.LPM_API_BASE ?? "https://api.legapaupermilano.it";

/** Forward to the API and hand back its status and JSON body untouched. */
export async function forward(request: Request, path: string, method: "GET" | "POST"): Promise<Response> {
  const headers: Record<string, string> = {};
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) headers["X-Forwarded-For"] = forwardedFor;
  let body: string | undefined;
  if (method === "POST") {
    body = await request.text();
    headers["Content-Type"] = "application/json";
  }
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body, cache: "no-store" });
  } catch {
    return Response.json({ error: "could not reach the API" }, { status: 502 });
  }
  const text = await res.text();
  return new Response(text || "{}", {
    status: res.status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
