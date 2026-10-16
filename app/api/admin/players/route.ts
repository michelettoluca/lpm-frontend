import { proxy } from "@/app/lib/adminRoute";

/** Every player, to pick a team's members from. Super admin only. GET /api/admin/players → GET /admin/players */
export async function GET(request: Request) {
  return proxy(request, "/admin/players", { method: "GET" });
}
