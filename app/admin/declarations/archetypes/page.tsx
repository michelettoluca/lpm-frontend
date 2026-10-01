import { redirect } from "next/navigation";
// The Lega Pauper Italia list lives under Impostazioni.
export default function OldLpiListPage() { redirect("/admin/lpi"); }
