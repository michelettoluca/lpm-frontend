import { redirect } from "next/navigation";
// The archetype list is its own section of the panel now.
export default function OldArchetypeListPage() { redirect("/admin/archetypes"); }
