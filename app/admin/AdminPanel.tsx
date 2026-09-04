"use client";

import { useId, useState } from "react";
import type { Season } from "@/app/lib/adminTypes";
import { DangerZone } from "./DangerZone";
import { ImportForm } from "./ImportForm";

/**
 * Holds the admin key for both sections.
 *
 * It lives in component state and nowhere else — not in storage, not in a
 * cookie, not on the server. Reloading the page loses it, which is the point:
 * nothing is left behind on a shared machine.
 */
export function AdminPanel({ initialSeasons }: { initialSeasons: Season[] }) {
  const [apiKey, setApiKey] = useState("");
  const [reveal, setReveal] = useState(false);
  const keyId = useId();

  return (
    <>
      <section className="mb-8">
        <label htmlFor={keyId} className="lbl block">
          Chiave admin
        </label>
        <p className="mt-1 text-[12px] leading-[1.4] text-ink/50">
          Non viene salvata da nessuna parte: se ricarichi la pagina va
          riscritta.
        </p>
        <div className="mt-1.5 flex gap-2">
          <input
            id={keyId}
            type={reveal ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder="••••••••••••"
            className="w-full rounded-xl border-[1.5px] border-ink/15 bg-white px-3 py-2.5 text-[14px] outline-none transition-colors focus:border-accent"
          />
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-pressed={reveal}
            className="shrink-0 rounded-xl border-[1.5px] border-ink/20 px-3 text-[13px] font-bold text-ink/70 transition-colors hover:border-ink/40"
          >
            {reveal ? "Nascondi" : "Mostra"}
          </button>
        </div>
      </section>

      <ImportForm initialSeasons={initialSeasons} apiKey={apiKey} />
      <DangerZone apiKey={apiKey} />
    </>
  );
}
