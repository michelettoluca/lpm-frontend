"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import type { AdminError, ImportResult, ManagedEvent, MeleeTournament } from "@/app/lib/adminTypes";
import { formatDateMeta } from "@/app/lib/format";
import { useAdmin } from "./AdminShell";
import { Badge, BUTTON, BUTTON_GHOST, BUTTON_PRIMARY, displayTime } from "./dashboardUi";
import { ErrorPanel, FieldError } from "./ErrorPanel";
import { CONTROL, CONTROL_INVALID, Warning } from "./fields";

type Kind = "standings" | "matches";

const LABELS: Record<Kind, string> = { standings: "Standings", matches: "Matches" };

/** Minimal CSV reader: quoted fields, doubled quotes, CRLF. Enough for melee.gg exports. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

/** What the pre-upload checks need from one export. */
type Summary = { kind: Kind; phases: Set<string>; teams: Set<string>; rounds: number };

/**
 * Tell the two melee.gg exports apart by their columns, not their filename, so
 * a renamed file still lands in the right slot and the two can't be swapped.
 * Columns match the ones the backend requires from each export.
 */
async function summarize(file: File): Promise<Summary | null> {
  const [header, ...records] = parseCsv((await file.text()).replace(/^\uFEFF/, ""));
  if (!header) return null;
  const col = (name: string) => header.findIndex((h) => h.trim() === name);
  const values = (name: string) => records.map((r) => (r[col(name)] ?? "").trim()).filter(Boolean);
  const rounds = (name: string) => Math.max(0, ...values(name).map(Number).filter(Number.isFinite));

  if (col("TeamPlayers1ID") >= 0 && col("MatchRecord") >= 0) {
    return { kind: "standings", phases: new Set(values("PhaseId")), teams: new Set(values("TeamId")), rounds: rounds("RoundNumber") };
  }
  if (col("Team1WinsAndByes") >= 0 && col("Team2WinsAndByes") >= 0) {
    return {
      kind: "matches",
      phases: new Set(values("PhaseId")),
      teams: new Set([...values("Team1Id"), ...values("Team2Id")]),
      rounds: rounds("RoundNumber"),
    };
  }
  return null;
}

/**
 * Catch the mismatches the backend would reject, before uploading: files from
 * different tournaments, or the same tournament downloaded at different rounds.
 */
function mismatch(standings: Summary, matches: Summary): string | null {
  const samePhase = [...matches.phases].every((p) => standings.phases.has(p));
  const missing = [...matches.teams].filter((t) => !standings.teams.has(t)).length;
  if (!samePhase || missing > matches.teams.size / 2) {
    return "I due file sono di tornei diversi. Scarica standings e matches dalla pagina dello stesso torneo.";
  }
  if (missing > 0) {
    return `${missing} ${missing === 1 ? "giocatore dei match non compare" : "giocatori dei match non compaiono"} nelle standings. Riscarica entrambi i file.`;
  }
  if (standings.rounds !== matches.rounds) {
    return `Le standings arrivano al turno ${standings.rounds}, i match al turno ${matches.rounds}: sono stati scaricati in momenti diversi. Riscaricali entrambi a torneo concluso.`;
  }
  return null;
}

/**
 * Read a Melee tournament id from what the admin pasted: the bare number or a
 * tournament link such as https://melee.gg/Tournament/View/461290.
 */
export function parseTournamentId(input: string): number | null {
  const text = input.trim();
  const match = /^\d+$/.test(text) ? [text, text] : /melee\.gg\/Tournament\/(?:View\/)?(\d+)/i.exec(text);
  const id = match ? Number(match[1]) : NaN;
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** Whether a tournament from the list can be imported now. */
function importable(t: MeleeTournament): boolean {
  return t.imported_event_id === null && (t.ended || t.status === "");
}

/** Melee's statuses, in Italian; anything else is shown as Melee wrote it. */
const MELEE_STATUS: Record<string, string> = {
  canceled: "Annullato",
  registration: "Iscrizioni aperte",
  "in progress": "In corso",
};

function TournamentStatus({ tournament }: { tournament: MeleeTournament }) {
  if (tournament.imported_event_id !== null) return <Badge tone="success">Già importato</Badge>;
  if (tournament.ended) return <Badge>Concluso</Badge>;
  return <Badge>{MELEE_STATUS[tournament.status.toLowerCase()] ?? (tournament.status || "Stato sconosciuto")}</Badge>;
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
  const [files, setFiles] = useState<Record<Kind, { file: File; summary: Summary } | null>>({
    standings: null,
    matches: null,
  });
  const [unknown, setUnknown] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<"api" | "csv" | null>(null);
  const [pendingTournament, setPendingTournament] = useState<number | null>(null);
  const [tournaments, setTournaments] = useState<MeleeTournament[] | null>(null);
  const [listError, setListError] = useState<AdminError | null>(null);
  const [error, setError] = useState<AdminError | null>(null);
  const [tournament, setTournament] = useState("");
  const [apiError, setApiError] = useState<AdminError | null>(null);
  const inputId = useId();
  const tournamentInputId = useId();
  const tournamentId = parseTournamentId(tournament);
  const tournamentFieldError =
    apiError?.kind === "bad_request" && apiError.field === "tournament_id" ? apiError.message : null;

  // Offer the tournaments Melee lists around the event's day, so nobody has to
  // copy a link from melee.gg.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await call<MeleeTournament[]>(`/api/admin/melee/tournaments?event_id=${event.id}`);
      if (cancelled) return;
      if (res.ok) setTournaments(res.data);
      else setListError(res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [call, event.id]);

  const problem = files.standings && files.matches ? mismatch(files.standings.summary, files.matches.summary) : null;
  const ready = files.standings !== null && files.matches !== null && problem === null;
  const fieldError = (field: Kind) => (error?.kind === "bad_request" && error.field === field ? error.message : null);

  async function add(picked: FileList | null) {
    if (!picked || picked.length === 0) return;
    const next = { ...files };
    const rejected: string[] = [];
    for (const file of Array.from(picked)) {
      const summary = await summarize(file);
      if (summary) next[summary.kind] = { file, summary };
      else rejected.push(file.name);
    }
    setFiles(next);
    setUnknown(rejected);
    setError(null);
  }

  function remove(kind: Kind) {
    setFiles({ ...files, [kind]: null });
    setError(null);
  }

  function imported(result: ImportResult) {
    setEvents((prev) => prev.map((e) => (e.id === result.event_id ? { ...e, has_results: true } : e)));
    onImported(result);
  }

  async function runApiImport(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    if (tournamentId !== null) await importTournament(tournamentId);
  }

  async function importTournament(id: number) {
    if (pending) return;
    setPending("api");
    setPendingTournament(id);
    setApiError(null);
    setError(null);
    const res = await call<ImportResult>("/api/admin/import/melee-api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: event.id, tournament_id: id }),
    });
    setPending(null);
    setPendingTournament(null);
    if (!res.ok) {
      setApiError(res.error);
      return;
    }
    setTournament("");
    imported(res.data);
  }

  async function runImport(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    if (!ready || pending) return;
    setPending("csv");
    setError(null);
    setApiError(null);

    const body = new FormData();
    body.set("event_id", String(event.id));
    body.set("standings", files.standings!.file);
    body.set("matches", files.matches!.file);
    const res = await call<ImportResult>("/api/admin/import", { method: "POST", body });

    setPending(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setFiles({ standings: null, matches: null });
    imported(res.data);
  }

  return (
    <div className="card p-4">
      <h2 className="text-[15px] font-semibold">Importa risultati</h2>

      <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-ink/55">
        Scegli il torneo su melee.gg: il backend scarica classifica e match e li confronta fra loro prima di salvarli.
        Il torneo deve essere concluso.
      </p>

      {tournaments === null && listError === null && (
        <p className="mt-5 text-[13px] text-ink/45">Cerco i tornei su melee.gg…</p>
      )}
      {listError && listError.kind !== "disabled" && (
        <div className="mt-5">
          <ErrorPanel error={listError} source="api" />
        </div>
      )}
      {tournaments !== null && tournaments.length === 0 && (
        <p className="mt-5 text-[13px] text-ink/55">
          Nessun torneo su melee.gg nei tre giorni prima e dopo la tappa. Se c&apos;è, incolla il suo link qui sotto.
        </p>
      )}
      {tournaments !== null && tournaments.length > 0 && (
        <ul className="mt-5 divide-y divide-ink/8 rounded-lg border border-ink/10">
          {tournaments.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5 pr-2.5 pl-4">
              <div className="min-w-0 flex-1 basis-56">
                <a
                  href={t.url}
                  target="_blank"
                  rel="noopener"
                  className="block truncate font-medium underline-offset-2 hover:underline"
                >
                  {t.name || `Torneo ${t.id}`}
                </a>
                <p className="tn mt-0.5 text-[13px] text-ink/50">
                  {t.same_day ? "Stesso giorno della tappa" : "Nei giorni vicini"}
                  {t.last_pair_date &&
                    ` · ultimo turno ${formatDateMeta(t.last_pair_date)} ${displayTime(t.last_pair_date)}`}
                </p>
              </div>
              <TournamentStatus tournament={t} />
              {t.imported_event_id !== null ? (
                <Link href={`/admin/events/${t.imported_event_id}`} className={BUTTON_GHOST}>
                  Apri tappa
                </Link>
              ) : (
                <button
                  type="button"
                  className={t.same_day && importable(t) ? BUTTON_PRIMARY : BUTTON}
                  disabled={pending !== null || !importable(t)}
                  onClick={() => void importTournament(t.id)}
                >
                  {pendingTournament === t.id ? "Import in corso…" : "Importa"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={runApiImport}>
        <label htmlFor={tournamentInputId} className="lbl mt-5 block">
          {tournaments !== null && tournaments.length > 0 ? "Non è in lista? Incolla il link" : "Torneo su melee.gg"}
        </label>
        <div className="mt-1.5 flex flex-wrap gap-3">
          <input
            id={tournamentInputId}
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://melee.gg/Tournament/View/461290"
            value={tournament}
            onChange={(e) => {
              setTournament(e.target.value);
              setApiError(null);
            }}
            disabled={pending !== null}
            aria-invalid={tournamentFieldError !== null}
            className={`${CONTROL} min-w-0 flex-1 basis-64 ${tournamentFieldError ? CONTROL_INVALID : ""}`}
          />
          <button type="submit" className={BUTTON_PRIMARY} disabled={pending !== null || tournamentId === null}>
            {pending === "api" && pendingTournament === tournamentId ? "Import in corso…" : "Importa da melee.gg"}
          </button>
        </div>
        {tournamentFieldError && <FieldError message={tournamentFieldError} />}
        {tournament.trim() !== "" && tournamentId === null && (
          <Warning>Non trovo il numero del torneo: incolla il link della pagina del torneo o solo il numero.</Warning>
        )}
        {(apiError?.kind === "disabled" || listError?.kind === "disabled") && (
          <Warning>Le credenziali API di Melee non sono configurate sul backend: per ora carica i CSV qui sotto.</Warning>
        )}
        {apiError && !tournamentFieldError && apiError.kind !== "disabled" && <ErrorPanel error={apiError} source="api" />}
      </form>

      <div className="mt-6 flex items-center gap-3 text-[12px] font-semibold  text-ink/40">
        <span className="h-px flex-1 bg-ink/10" />
        oppure carica i CSV
        <span className="h-px flex-1 bg-ink/10" />
      </div>

      <form onSubmit={runImport}>
        <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-ink/55">
          Carica i due CSV scaricati dalla pagina del torneo su melee.gg, standings e matches. Il backend li confronta
          fra loro e rifiuta l&apos;import se non tornano.
        </p>

        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault();
            if (pending === null) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (pending === null) void add(e.dataTransfer.files);
          }}
          className={`mt-5 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-7 text-center transition-colors ${
            dragging ? "bg-tint-grad border-accent" : "border-ink/20 bg-surface/50 hover:border-ink/40 hover:bg-surface"
          } ${pending ? "pointer-events-none opacity-60" : ""}`}
        >
          <span className="text-[13px] font-medium">
            Trascina qui i file <span className="text-accent">oppure sceglili</span>
          </span>
          <span className="text-[12px] text-ink/50">Puoi selezionarli insieme: li riconosciamo dal contenuto.</span>
          <input
            id={inputId}
            type="file"
            accept=".csv,text/csv"
            multiple
            className="sr-only"
            disabled={pending !== null}
            onChange={(e) => {
              void add(e.target.files);
              e.target.value = "";
            }}
          />
        </label>

        <ul className="mt-3 divide-y divide-ink/8 rounded-lg border border-ink/10">
          {(["standings", "matches"] as const).map((kind) => {
            const file = files[kind]?.file;
            return (
              <li key={kind} className="flex min-h-12 items-center gap-3 py-1.5 pr-1.5 pl-4">
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-medium ${
                    file ? "bg-accent text-white" : "border border-ink/20"
                  }`}
                  aria-hidden
                >
                  {file ? "✓" : ""}
                </span>
                <span className="lbl w-20 shrink-0">{LABELS[kind]}</span>
                <span className={`min-w-0 flex-1 truncate text-[13px] ${file ? "" : "text-ink/40"}`}>
                  {file ? file.name : "Manca"}
                </span>
                {file && (
                  <button
                    type="button"
                    className={BUTTON_GHOST}
                    onClick={() => remove(kind)}
                    disabled={pending !== null}
                    aria-label={`Rimuovi ${LABELS[kind]}`}
                  >
                    ✕
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {fieldError("standings") && <FieldError message={fieldError("standings")!} />}
        {fieldError("matches") && <FieldError message={fieldError("matches")!} />}
        {unknown.length > 0 && (
          <Warning>
            Non riconosciuto: {unknown.join(", ")}. Servono gli export «Standings» e «Matches» del torneo su melee.gg.
          </Warning>
        )}
        {problem && <Warning>{problem}</Warning>}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="submit" className={BUTTON_PRIMARY} disabled={pending !== null || !ready}>
            {pending === "csv" ? "Import in corso…" : "Importa CSV"}
          </button>
          {!ready && !pending && (
            <span className="text-[13px] text-ink/45">
              {files.standings || files.matches ? "Manca ancora un file." : "Aggiungi entrambi i file."}
            </span>
          )}
        </div>
        {error && !(error.kind === "bad_request" && (error.field === "standings" || error.field === "matches")) && (
          <ErrorPanel error={error} />
        )}
      </form>
    </div>
  );
}
