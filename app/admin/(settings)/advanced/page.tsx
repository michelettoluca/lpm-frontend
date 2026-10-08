"use client";

import { DangerZone } from "../../DangerZone";
import { PageHeader } from "../../dashboardUi";

/** Operations on the whole database, kept away from the everyday pages. */
export default function AdvancedPage() {
  return (
    <>
      <PageHeader section title="Avanzate" meta="Operazioni sull'intero database. Non servono durante la stagione." />
      <DangerZone />
    </>
  );
}
