"use client";

import { PageHeader } from "../../dashboardUi";
import { LpiList } from "./LpiList";

export default function LpiListPage() {
  return (
    <div>
      <PageHeader section title="Archetipi" meta="La lista di Lega Pauper Italia: i mazzi tra cui i giocatori scelgono su /mazzo." />
      <LpiList />
    </div>
  );
}
