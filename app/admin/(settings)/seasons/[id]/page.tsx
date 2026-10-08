"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAdmin } from "../../../AdminShell";

// A season is now the panel's context: its old address picks it and opens the overview.
export default function OldSeasonPage() {
  const { id } = useParams<{ id: string }>();
  const { selectSeason } = useAdmin();
  const router = useRouter();
  useEffect(() => {
    if (Number(id)) selectSeason(Number(id));
    router.replace("/admin");
  }, [id, selectSeason, router]);
  return null;
}
