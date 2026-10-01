import { proxy } from "@/app/lib/adminRoute";

/** Stop taking declarations from players. */
export function POST(request: Request) {
  return proxy(request, "/admin/declarations/close", { method: "POST" });
}
