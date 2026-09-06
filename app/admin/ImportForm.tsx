"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import type { AdminError, ImportResult, ManagedEvent } from "@/app/lib/adminTypes";
import { useAdmin } from "./AdminShell";
import { displayDate } from "./dashboardUi";
import { ErrorPanel, FieldError } from "./ErrorPanel";
import { CONTROL, CONTROL_INVALID, Field, FileInput, SubmitButton, Warning } from "./fields";

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

/**
 * Attach Melee results to an existing event. The target is chosen from the
 * events that still have no results; the page can preselect one from a row.
 */
export function ImportForm({
  candidates,
  eventId,
  onEventId,
}: {
  candidates: ManagedEvent[];
  eventId: string;
  onEventId: (id: string) => void;
}) {
  const { setEvents, call } = useAdmin();
  const [standings, setStandings] = useState<File | null>(null);
  const [matches, setMatches] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AdminError | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const ids = { event: useId(), standings: useId(), matches: useId() };

  const target = candidates.find((event) => String(event.id) === eventId);
  const ready = target !== undefined && standings !== null && matches !== null;
  const fieldError = (field: string) =>
    error?.kind === "bad_request" && error.field === field ? error.message : null;

  async function runImport() {
    if (!target) return;
    setPending(true);
    setError(null);
    setResult(null);

    const body = new FormData();
    body.set("event_id", String(target.id));
    body.set("standings", standings!);
    body.set("matches", matches!);
    const res = await call<ImportResult>("/api/admin/import", { method: "POST", body });

    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setResult(res.data);
    setEvents((prev) =>
      prev.map((event) => (event.id === res.data.event_id ? { ...event, has_results: true } : event)),
    );
    onEventId("");
    setStandings(null);
    setMatches(null);
    formRef.current?.reset();
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!ready || pending) return;
    void runImport();
  }

  return (
    <section>
      <h2 className="text-[16px] font-extrabold uppercase tracking-[0.08em]">Importa risultati</h2>
      <p className="mt-1.5 max-w-xl text-[13px] leading-[1.5] text-ink/55">
        Scegli l&apos;evento da completare e carica entrambi i CSV scaricati dalla pagina del torneo su melee.gg.
        Il backend li confronta fra loro e rifiuta l&apos;import se non tornano.
      </p>

      <form ref={formRef} onSubmit={onSubmit} className="card mt-4 space-y-4 p-5">
        <Field label="Evento da completare" htmlFor={ids.event}>
          <select
            id={ids.event}
            value={target ? eventId : ""}
            onChange={(event) => onEventId(event.target.value)}
            disabled={pending || candidates.length === 0}
            className={`${CONTROL} ${fieldError("event_id") ? CONTROL_INVALID : ""}`}
          >
            <option value="">
              {candidates.length === 0 ? "Nessun evento senza risultati" : "Seleziona un evento senza risultati"}
            </option>
            {candidates.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name} · {displayDate(event.played_at)}
              </option>
            ))}
          </select>
          {fieldError("event_id") && <FieldError message={fieldError("event_id")!} />}
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
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

        <SubmitButton pending={pending} disabled={!ready} pendingLabel="Import in corso…">
          {target ? `Importa risultati in “${target.name}”` : "Importa risultati"}
        </SubmitButton>

        {!ready && !pending && (
          <p className="text-center text-[12px] text-ink/45">Seleziona un evento e entrambi i file.</p>
        )}
      </form>

      {result && (
        <div className="panel-in mt-4 rounded-[18px] border-[1.5px] border-accent bg-tint p-4">
          <div className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-accent">Import riuscito</div>
          <p className="mt-2 text-[13px] leading-[1.5] text-ink/80">
            Torneo melee <span className="tn font-bold">{result.melee_tournament_id}</span> importato
            nell&apos;evento <span className="tn font-bold">{result.event_id}</span>.
          </p>
          <Link
            href={`/events/${result.event_id}`}
            className="mt-3 inline-block rounded-xl bg-accent px-4 py-2.5 text-[14px] font-bold text-white transition-opacity hover:opacity-90"
          >
            Vai alla tappa →
          </Link>
        </div>
      )}

      {error && <ErrorPanel error={error} />}
    </section>
  );
}
