"use client";

import { useId, useRef, useState } from "react";
import type { AdminError, ImportResult, ManagedEvent } from "@/app/lib/adminTypes";
import { useAdmin } from "./AdminShell";
import { BUTTON_PRIMARY } from "./dashboardUi";
import { ErrorPanel, FieldError } from "./ErrorPanel";
import { Field, FileInput, Warning } from "./fields";

const STANDINGS_PREFIX = "standings-tournament";
const MATCHES_PREFIX = "matches-tournament";

/**
 * Both CSVs come off the same melee.gg page and are trivial to mix up. Swapping
 * them fails as a confusing verification mismatch rather than a clear error, so
 * flag it from the filename before the upload goes anywhere.
 */
function looksSwapped(file: File | null, otherPrefix: string): boolean {
  return file !== null && file.name.toLowerCase().startsWith(otherPrefix);
}

/** Attach Melee results to an event that has none yet. */
export function ImportPanel({
  event,
  onImported,
}: {
  event: ManagedEvent;
  onImported: (result: ImportResult) => void;
}) {
  const { setEvents, call } = useAdmin();
  const [standings, setStandings] = useState<File | null>(null);
  const [matches, setMatches] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AdminError | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const ids = { standings: useId(), matches: useId() };

  const ready = standings !== null && matches !== null;
  const fieldError = (field: string) =>
    error?.kind === "bad_request" && error.field === field ? error.message : null;

  async function runImport(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    if (!ready || pending) return;
    setPending(true);
    setError(null);

    const body = new FormData();
    body.set("event_id", String(event.id));
    body.set("standings", standings);
    body.set("matches", matches);
    const res = await call<ImportResult>("/api/admin/import", { method: "POST", body });

    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setStandings(null);
    setMatches(null);
    formRef.current?.reset();
    setEvents((prev) => prev.map((e) => (e.id === res.data.event_id ? { ...e, has_results: true } : e)));
    onImported(res.data);
  }

  return (
    <form ref={formRef} onSubmit={runImport} className="card p-5 sm:p-6">
      <h2 className="text-lg font-extrabold tracking-[-0.01em]">Importa risultati</h2>
      <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink/55">
        Carica entrambi i CSV scaricati dalla pagina del torneo su melee.gg. Il backend li confronta fra loro e rifiuta
        l&apos;import se non tornano.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Standings-tournament-….csv" htmlFor={ids.standings}>
          <FileInput
            id={ids.standings}
            name="standings"
            onPick={setStandings}
            disabled={pending}
            invalid={Boolean(fieldError("standings"))}
          />
          {looksSwapped(standings, MATCHES_PREFIX) && (
            <Warning>Questo sembra il file dei match. Controlla di non aver invertito i due file.</Warning>
          )}
          {fieldError("standings") && <FieldError message={fieldError("standings")!} />}
        </Field>
        <Field label="Matches-tournament-….csv" htmlFor={ids.matches}>
          <FileInput
            id={ids.matches}
            name="matches"
            onPick={setMatches}
            disabled={pending}
            invalid={Boolean(fieldError("matches"))}
          />
          {looksSwapped(matches, STANDINGS_PREFIX) && (
            <Warning>Questo sembra il file delle standings. Controlla di non aver invertito i due file.</Warning>
          )}
          {fieldError("matches") && <FieldError message={fieldError("matches")!} />}
        </Field>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="submit" className={BUTTON_PRIMARY} disabled={pending || !ready}>
          {pending ? "Import in corso…" : "Importa risultati"}
        </button>
        {!ready && !pending && <span className="text-[13px] text-ink/45">Seleziona entrambi i file.</span>}
      </div>
      {error && !(error.kind === "bad_request" && (error.field === "standings" || error.field === "matches")) && (
        <ErrorPanel error={error} />
      )}
    </form>
  );
}
