import { MELEE_SYNC_PATH } from "@/app/lib/adminApi";
import { proxy } from "@/app/lib/adminRoute";

/** Import every past event from the Melee tournament held on its day. */
export async function POST(request: Request) {
  return proxy(request, MELEE_SYNC_PATH, { method: "POST" });
}
