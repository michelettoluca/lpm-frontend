import { redirect } from "next/navigation";
// The page moved to /mazzo; keep links already shared working.
export default function OldDeclarePage() { redirect("/mazzo"); }
