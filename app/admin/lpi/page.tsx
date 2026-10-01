"use client";

import { PageHeader } from "../dashboardUi";
import { LpiList } from "./LpiList";

export default function LpiListPage() {
  return (
    <div>
      <PageHeader title="Archetipi LPI" meta="I mazzi di Lega Pauper Italia tra cui i giocatori scelgono." />
      <LpiList />
    </div>
  );
}
