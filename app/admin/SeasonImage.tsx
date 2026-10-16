"use client";

import { useState } from "react";
import { SEASON_IMAGE } from "@/app/api/admin/events/[id]/immagini/kinds";
import { BUTTON_PRIMARY, SectionHeader } from "./dashboardUi";
import { Card, useCanShare } from "./events/[id]/EventImages";

/**
 * The season's standings as one long image for WhatsApp, every player in
 * one column. Like the tappa's images, drawn only when asked.
 */
export function SeasonImage() {
  const [wanted, setWanted] = useState(false);
  const canShare = useCanShare();
  return (
    <section className="mt-10">
      <SectionHeader
        title="Classifica per WhatsApp"
        action={
          !wanted ? (
            <button type="button" className={BUTTON_PRIMARY} onClick={() => setWanted(true)}>
              Genera l&apos;immagine
            </button>
          ) : undefined
        }
      />
      <p className="mb-4 max-w-xl text-[13px] leading-relaxed text-ink/55">
        Tutti i giocatori in fila, dalla classifica del sito: un&apos;immagine lunga, da ingrandire. Su WhatsApp mandala in
        HD (o come documento): in qualità standard la rimpicciolisce troppo e i nomi non si leggono.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card img={SEASON_IMAGE} label="Classifica generale" wanted={wanted} canShare={canShare} tall />
      </ul>
    </section>
  );
}
