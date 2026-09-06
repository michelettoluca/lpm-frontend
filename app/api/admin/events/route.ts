import { adminFetch } from "@/app/lib/adminApi";
import { badRequest, missingKey, readKey, toResponse } from "@/app/lib/adminRoute";

async function handle(request: Request) {
 const key = readKey(request); if (!key) return missingKey();
 const id = new URL(request.url).searchParams.get("id");
 if ((request.method === "PUT" || request.method === "DELETE") && (!id || !Number.isSafeInteger(Number(id)) || Number(id) <= 0)) return badRequest({kind:"bad_request",message:"invalid event id"});
 let body: string | undefined;
 if (request.method === "POST" || request.method === "PUT") {
  try { body = JSON.stringify(await request.json()); } catch { return badRequest({kind:"bad_request",message:"invalid event body"}); }
 }
 return toResponse(await adminFetch(`/admin/events${request.method === "PUT" || request.method === "DELETE" ? `/${Number(id)}` : ""}`, key, {method:request.method, body, contentType:body ? "application/json" : undefined}));
}
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
