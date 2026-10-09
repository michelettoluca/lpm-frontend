import { currentAdmin } from "@/app/lib/adminApi";
import { forwardedFor, missingSession, readSession } from "@/app/lib/adminRoute";

/** Null when an admin is signed in, otherwise the 401 to answer with. The images are theirs alone. */
export async function requireAdmin(request: Request): Promise<Response | null> {
  const token = readSession(request);
  if (!token) return missingSession();
  const me = await currentAdmin(token, forwardedFor(request));
  return me.ok ? null : missingSession();
}
