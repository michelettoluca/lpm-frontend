"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import type { AdminError, ImportResult, Season } from "@/app/lib/adminTypes";
import { callAdmin } from "./client";
import { ConfirmResetDialog } from "./ConfirmResetDialog";
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

/** Newest season still running, falling back to the newest of any state. */
function defaultSeason(seasons: Season[]): number | null {
  const running = seasons.find((s) => s.ended_at === null);
  return (running ?? seasons[0])?.id ?? null;
}

export function ImportForm({
  initialSeasons,
  apiKey,
}: {
  initialSeasons: Season[];
  apiKey: string;
}) {
  const [seasons, setSeasons] = useState(initialSeasons);
  const [seasonId, setSeasonId] = useState<number | null>(
    defaultSeason(initialSeasons),
  );

  const [name, setName] = useState("");
  const [playedAt, setPlayedAt] = useState("");
  const [standings, setStandings] = useState<File | null>(null);
  const [matches, setMatches] = useState<File | null>(null);
  const [replaceAll, setReplaceAll] = useState(false);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AdminError | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [newSeasonOpen, setNewSeasonOpen] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState("");
  const [creatingSeason, setCreatingSeason] = useState(false);
  const [seasonError, setSeasonError] = useState<AdminError | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const ids = {
    season: useId(),
    newSeason: useId(),
    name: useId(),
    playedAt: useId(),
    standings: useId(),
    matches: useId(),
    replace: useId(),
  };

  const ready =
    apiKey !== "" &&
    seasonId !== null &&
    name.trim() !== "" &&
    standings !== null &&
    matches !== null;

  const fieldError = (field: string) =>
    error?.kind === "bad_request" && error.field === field ? error.message : null;

  async function runImport() {
    setPending(true);
    setError(null);
    setResult(null);

    const body = new FormData();
    body.set("season_id", String(seasonId));
    body.set("name", name.trim());
    body.set("standings", standings!);
    body.set("matches", matches!);
    if (playedAt) body.set("played_at", playedAt);
    if (replaceAll) {
      body.set("reset", "true");
      body.set("confirm", "RESET");
    }

    const res = await callAdmin<ImportResult>("/api/admin/import", apiKey, {
      method: "POST",
      body,
    });

    setPending(false);
    if (res.ok) {
      setResult(res.data);
      setReplaceAll(false);
      setName("");
      setPlayedAt("");
      setStandings(null);
      setMatches(null);
      formRef.current?.reset();
    } else {
      setError(res.error);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || pending) return;
    // Wiping the database always goes through the typed confirmation.
    if (replaceAll) setConfirmOpen(true);
    else void runImport();
  }

  async function createSeason() {
    const trimmed = newSeasonName.trim();
    if (!trimmed || creatingSeason || apiKey === "") return;

    setCreatingSeason(true);
    setSeasonError(null);

    const res = await callAdmin<Season>("/api/admin/seasons", apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });

    setCreatingSeason(false);
    if (res.ok) {
      // Season names are not unique, so the list is keyed by id and the new
      // season goes to the front to match the API's newest-first ordering.
      setSeasons((prev) => [res.data, ...prev]);
      setSeasonId(res.data.id);
      setNewSeasonName("");
      setNewSeasonOpen(false);
    } else {
      setSeasonError(res.error);
    }
  }

  return (
    <section>
      <h2 className="text-[16px] font-extrabold uppercase tracking-[0.08em]">
        Importa torneo
      </h2>
      <p className="mt-1.5 text-[13px] leading-[1.5] text-ink/55">
        Servono entrambi i CSV scaricati dalla pagina del torneo su melee.gg. Il
        backend li confronta fra loro e rifiuta l&apos;import se non tornano.
      </p>

      <form ref={formRef} onSubmit={onSubmit} className="card mt-4 space-y-4 p-4">
        <Field label="Stagione" htmlFor={ids.season}>
          <div className="flex gap-2">
            <select
              id={ids.season}
              value={seasonId ?? ""}
              onChange={(e) => setSeasonId(Number(e.target.value))}
              disabled={pending || seasons.length === 0}
              className={`${CONTROL} ${fieldError("season_id") ? CONTROL_INVALID : ""}`}
            >
              {seasons.length === 0 && <option value="">Nessuna stagione</option>}
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.ended_at === null ? " · in corso" : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setNewSeasonOpen((v) => !v)}
              disabled={pending}
              aria-expanded={newSeasonOpen}
              className="shrink-0 rounded-xl border-[1.5px] border-ink/20 px-3 text-[13px] font-bold text-ink/70 transition-colors hover:border-ink/40 disabled:opacity-50"
            >
              {newSeasonOpen ? "Annulla" : "Nuova"}
            </button>
          </div>
          {fieldError("season_id") && <FieldError message={fieldError("season_id")!} />}

          {newSeasonOpen && (
            <div className="panel-in mt-2.5 rounded-xl border border-ink/10 bg-ground p-3">
              <label htmlFor={ids.newSeason} className="lbl block">
                Nome della nuova stagione
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  id={ids.newSeason}
                  value={newSeasonName}
                  onChange={(e) => setNewSeasonName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void createSeason();
                    }
                  }}
                  placeholder="Season 2027"
                  disabled={creatingSeason}
                  className={CONTROL}
                />
                <button
                  type="button"
                  onClick={() => void createSeason()}
                  disabled={
                    newSeasonName.trim() === "" || creatingSeason || apiKey === ""
                  }
                  className="shrink-0 rounded-xl bg-accent px-3.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {creatingSeason ? "…" : "Crea"}
                </button>
              </div>
              <p className="mt-1.5 text-[12px] text-ink/50">
                I nomi non sono univoci: due invii creano due stagioni.
              </p>
              {seasonError && <ErrorPanel error={seasonError} />}
            </div>
          )}
        </Field>

        <Field label="Nome evento" htmlFor={ids.name}>
          <input
            id={ids.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Lega Pauper Milano … - Tappa 10"
            disabled={pending}
            className={`${CONTROL} ${fieldError("name") ? CONTROL_INVALID : ""}`}
          />
          {fieldError("name") && <FieldError message={fieldError("name")!} />}
        </Field>

        <Field
          label="Data"
          htmlFor={ids.playedAt}
          hint="Facoltativa. Se la lasci vuota vale la data dentro il file delle standings."
        >
          <input
            id={ids.playedAt}
            type="date"
            value={playedAt}
            onChange={(e) => setPlayedAt(e.target.value)}
            disabled={pending}
            className={`${CONTROL} ${fieldError("played_at") ? CONTROL_INVALID : ""}`}
          />
          {fieldError("played_at") && <FieldError message={fieldError("played_at")!} />}
        </Field>

        <Field label="Standings-tournament-….csv" htmlFor={ids.standings}>
          <FileInput
            id={ids.standings}
            name="standings"
            onPick={setStandings}
            disabled={pending}
            invalid={Boolean(fieldError("standings"))}
          />
          {looksSwapped(standings, MATCHES_PREFIX) && (
            <Warning>
              Questo sembra il file dei match. Controlla di non aver invertito i
              due file.
            </Warning>
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
            <Warning>
              Questo sembra il file delle standings. Controlla di non aver
              invertito i due file.
            </Warning>
          )}
          {fieldError("matches") && <FieldError message={fieldError("matches")!} />}
        </Field>

        <div className="rounded-xl border-[1.5px] border-dashed border-ink/25 p-3">
          <label htmlFor={ids.replace} className="flex items-start gap-2.5">
            <input
              id={ids.replace}
              type="checkbox"
              checked={replaceAll}
              onChange={(e) => setReplaceAll(e.target.checked)}
              disabled={pending}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
            />
            <span>
              <span className="block text-[14px] font-bold">
                Sostituisci tutti i dati esistenti
              </span>
              <span className="mt-0.5 block text-[12px] leading-[1.4] text-ink/55">
                Cancella eventi, giocatori e match prima di importare. Le
                stagioni restano. Ti verrà chiesta una conferma scritta.
              </span>
            </span>
          </label>
        </div>

        <SubmitButton
          pending={pending}
          disabled={!ready}
          pendingLabel="Import in corso…"
        >
          {replaceAll ? "Sostituisci e importa" : "Importa torneo"}
        </SubmitButton>

        {!ready && !pending && (
          <p className="text-center text-[12px] text-ink/45">
            {apiKey === ""
              ? "Inserisci la chiave admin qui sopra."
              : "Servono stagione, nome e entrambi i file."}
          </p>
        )}
      </form>

      {result && (
        <div className="panel-in mt-4 rounded-[18px] border-[1.5px] border-accent bg-tint p-4">
          <div className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-accent">
            Import riuscito
          </div>
          <p className="mt-2 text-[13px] leading-[1.5] text-ink/80">
            Torneo melee <span className="tn font-bold">{result.melee_tournament_id}</span>{" "}
            importato come evento{" "}
            <span className="tn font-bold">{result.event_id}</span>.
          </p>
          <Link
            href={`/events/${result.event_id}`}
            className="mt-3 inline-block rounded-xl bg-accent px-4 py-2.5 text-[14px] font-bold text-white transition-opacity hover:opacity-90"
          >
            Vai alla tappa →
          </Link>
        </div>
      )}

      {error && (
        <ErrorPanel
          error={error}
          onUseReset={
            error.kind === "conflict"
              ? () => {
                  setReplaceAll(true);
                  setError(null);
                }
              : undefined
          }
        />
      )}

      <ConfirmResetDialog
        open={confirmOpen}
        title="Sostituisci tutti i dati"
        confirmLabel="Sostituisci e importa"
        pending={pending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          void runImport();
        }}
      >
        <p>
          Tutti gli eventi, i giocatori e i match esistenti verranno cancellati,
          poi verrà importato questo torneo. Le stagioni non vengono toccate.
        </p>
        <p>
          Cancellazione e import stanno nella stessa transazione: se l&apos;import
          fallisce, non viene cancellato nulla.
        </p>
      </ConfirmResetDialog>
    </section>
  );
}
