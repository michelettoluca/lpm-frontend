"use client";

import { useId, useState } from "react";
import type { AdminError, DeletedCounts, ResetResult } from "@/app/lib/adminTypes";
import { callAdmin } from "./client";
import { ConfirmResetDialog } from "./ConfirmResetDialog";
import { ErrorPanel } from "./ErrorPanel";

const NOUNS: Array<[keyof DeletedCounts, string, string]> = [
  ["events", "evento", "eventi"],
  ["matches", "match", "match"],
  ["users", "giocatore", "giocatori"],
  ["standings", "riga di classifica", "righe di classifica"],
  ["seasons", "stagione", "stagioni"],
];

/** "1 evento, 106 match e 54 giocatori" — zero counts are left out entirely. */
function describe(deleted: DeletedCounts): string {
  const parts = NOUNS.filter(([key]) => deleted[key] > 0).map(
    ([key, one, many]) => `${deleted[key]} ${deleted[key] === 1 ? one : many}`,
  );
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} e ${parts[parts.length - 1]}`;
}

export function DangerZone({ apiKey }: { apiKey: string }) {
  const [includeSeasons, setIncludeSeasons] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AdminError | null>(null);
  const [result, setResult] = useState<ResetResult | null>(null);
  const seasonsId = useId();

  async function runReset() {
    setPending(true);
    setError(null);
    setResult(null);

    const res = await callAdmin<ResetResult>("/api/admin/reset", apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "RESET", include_seasons: includeSeasons }),
    });

    setPending(false);
    if (res.ok) {
      setResult(res.data);
      setIncludeSeasons(false);
    } else {
      setError(res.error);
    }
  }

  const summary = result ? describe(result.deleted) : "";

  return (
    <section className="mt-12 border-t-[1.5px] border-dashed border-ink/20 pt-8">
      <h2 className="text-[16px] font-extrabold uppercase tracking-[0.08em] text-accent">
        Zona pericolosa
      </h2>
      <p className="mt-1.5 text-[13px] leading-[1.5] text-ink/55">
        Svuota il database senza importare niente. Serve solo se vuoi ripartire
        da zero: per reimportare un torneo già presente basta la casella
        «sostituisci tutti i dati» qui sopra.
      </p>

      <div className="mt-4 rounded-[22px] border-[1.5px] border-accent bg-white p-4">
        <label htmlFor={seasonsId} className="flex items-start gap-2.5">
          <input
            id={seasonsId}
            type="checkbox"
            checked={includeSeasons}
            onChange={(e) => setIncludeSeasons(e.target.checked)}
            disabled={pending}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
          />
          <span>
            <span className="block text-[14px] font-bold">
              Cancella anche le stagioni
            </span>
            <span className="mt-0.5 block text-[12px] leading-[1.4] text-ink/55">
              Invalida tutti gli id di stagione esistenti: dopo dovrai crearne
              una nuova prima di poter importare. Senza questa opzione le
              stagioni restano e il prossimo import funziona subito.
            </span>
          </span>
        </label>

        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={pending || apiKey === ""}
          className="mt-4 w-full rounded-xl bg-accent px-4 py-3 text-[15px] font-extrabold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Cancellazione in corso…" : "Svuota il database"}
        </button>
      </div>

      {result && (
        <div className="panel-in mt-4 rounded-[18px] border-[1.5px] border-accent bg-tint p-4">
          <div className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-accent">
            Database svuotato
          </div>
          <p className="mt-2 text-[13px] leading-[1.5] text-ink/80">
            {summary ? `Eliminati ${summary}.` : "Non c'era niente da cancellare."}
          </p>
          <p className="mt-1.5 text-[12px] leading-[1.45] text-ink/55">
            {result.seasons_cleared
              ? "Anche le stagioni sono state cancellate: creane una nuova prima del prossimo import."
              : "Le stagioni sono state mantenute, quindi puoi importare subito."}
          </p>
        </div>
      )}

      {error && <ErrorPanel error={error} />}

      <ConfirmResetDialog
        open={confirmOpen}
        title="Svuota il database"
        confirmLabel="Svuota"
        pending={pending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          void runReset();
        }}
      >
        <p>
          Verranno cancellati tutti gli eventi, i giocatori, i match e le
          classifiche. L&apos;operazione non è reversibile.
        </p>
        <p>
          {includeSeasons
            ? "Anche le stagioni verranno cancellate: ogni id di stagione esistente smetterà di essere valido."
            : "Le stagioni verranno mantenute."}
        </p>
      </ConfirmResetDialog>
    </section>
  );
}
