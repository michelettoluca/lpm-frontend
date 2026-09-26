import { redirect } from "next/navigation";
// Events are managed inside their season now.
export default function AdminEventsPage() { redirect("/admin/seasons"); }
