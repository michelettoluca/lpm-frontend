import { proxy } from "@/app/lib/adminRoute";

/** How players find themselves on /mazzo: `{ find_by: "table" | "name" }`. */
export async function PUT(request: Request) {
  return proxy(request, "/admin/declarations/find-by", { method: "PUT", body: await request.text(), contentType: "application/json" });
}
