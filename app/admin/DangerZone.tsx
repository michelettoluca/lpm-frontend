"use client";

import { useId, useState } from "react";
import type { AdminError, DeletedCounts, ResetResult } from "@/app/lib/adminTypes";
import { useAdmin } from "./AdminShell";
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

export function DangerZone() {
  const { call, refresh } = useAdmin();
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

    const res = await call<ResetResult>("/api/admin/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "RESET", include_seasons: includeSeasons }),
    });

    if (res.ok) {
      setResult(res.data);
      setIncludeSeasons(false);
      // Events are gone and seasons may be too: pull fresh lists for every section.
      await refresh();
    } else {
      setError(res.error);
    }
    setPending(false);
  }

  const summary = result ? describe(result.deleted) : "";

  return (
    <section className="mt-12 border-t-[1.5px] border-dashed border-ink/20 pt-8">
      <h2 className="text-[16px] font-extrabold uppercase tracking-[0.08em] text-accent">
        Zona pericolosa
      </h2>
      <p className="mt-1.5 max-w-xl text-[13px] leading-[1.5] text-ink/55">
        Svuota il database: tutti gli eventi, i match, le classifiche e i
        giocatori. Serve solo per ripartire da zero. Per rifare un singolo
        torneo basta eliminare il suo evento e importarlo di nuovo.
      </p>

      <div className="mt-4 max-w-xl rounded-[22px] border-[1.5px] border-accent bg-white p-4">
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
              Rimuove ogni stagione e la selezione di quella attiva: dopo dovrai
              crearne una nuova e renderla attiva. Senza questa opzione le
              stagioni restano e puoi programmare subito nuovi eventi.
            </span>
          </span>
        </label>

        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={pending}
          className="mt-4 w-full rounded-xl bg-accent px-4 py-3 text-[15px] font-extrabold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? "Cancellazione in corso…" : "Svuota il database"}
        </button>
      </div>

      {result && (
        <div className="panel-in mt-4 max-w-xl rounded-[18px] border-[1.5px] border-accent bg-tint p-4">
          <div className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-accent">
            Database svuotato
          </div>
          <p className="mt-2 text-[13px] leading-[1.5] text-ink/80">
            {summary ? `Eliminati ${summary}.` : "Non c'era niente da cancellare."}
          </p>
          <p className="mt-1.5 text-[12px] leading-[1.45] text-ink/55">
            {result.seasons_cleared
              ? "Anche le stagioni sono state cancellate: creane una nuova e rendila attiva."
              : "Le stagioni sono state mantenute."}
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
            ? "Anche le stagioni verranno cancellate, compresa la selezione di quella attiva."
            : "Le stagioni verranno mantenute."}
        </p>
      </ConfirmResetDialog>
    </section>
  );
}
