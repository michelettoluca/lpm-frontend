"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import type { AdminError, ManagedEvent } from "@/app/lib/adminTypes";
import { useAdmin } from "../AdminShell";
import { ErrorPanel, FieldError } from "../ErrorPanel";
import { CONTROL, CONTROL_INVALID, Field } from "../fields";
import { ImportForm } from "../ImportForm";
import {
  ACTION,
  ACTION_ACCENT,
  Badge,
  CELL,
  ConfirmDelete,
  DashboardHeading,
  displayDateTime,
  EmptyState,
  HEAD_CELL,
  localDateTime,
  Notice,
  PRIMARY,
} from "../dashboardUi";

type Draft = { seasonId: string; name: string; format: string; playedAt: string };
const ALL = "all";

function toDraft(event: ManagedEvent): Draft {
  return {
    seasonId: String(event.season_id),
    name: event.name,
    format: event.format ?? "",
    playedAt: localDateTime(event.played_at),
  };
}

export default function EventsPage() {
  const { seasons, events, setEvents, call } = useAdmin();
  const activeSeason = seasons.find((season) => season.is_active);
  const [seasonFilter, setSeasonFilter] = useState(activeSeason ? String(activeSeason.id) : ALL);
  const [editing, setEditing] = useState<ManagedEvent | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>({ seasonId: "", name: "", format: "Pauper", playedAt: "" });
  const [deleting, setDeleting] = useState<ManagedEvent | null>(null);
  const [importId, setImportId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AdminError | null>(null);
  const [notice, setNotice] = useState("");
  const importRef = useRef<HTMLDivElement>(null);
  const ids = { filter: useId(), season: useId(), name: useId(), format: useId(), date: useId() };

  const seasonName = (id: number) => seasons.find((season) => season.id === id)?.name ?? `stagione ${id}`;
  const fieldError = (field: string) =>
    error?.kind === "bad_request" && error.field === field ? error.message : null;

  const visible = events
    .filter((event) => seasonFilter === ALL || String(event.season_id) === seasonFilter)
    .sort((a, b) => b.played_at.localeCompare(a.played_at));
  const candidates = visible.filter((event) => !event.has_results).sort((a, b) => a.played_at.localeCompare(b.played_at));

  function open(target: ManagedEvent | "new") {
    setEditing(target);
    setDraft(
      target === "new"
        ? {
            seasonId: seasonFilter !== ALL ? seasonFilter : activeSeason ? String(activeSeason.id) : "",
            name: "",
            format: "Pauper",
            playedAt: "",
          }
        : toDraft(target),
    );
    setError(null);
    setNotice("");
  }

  function close() {
    setEditing(null);
  }

  function startImport(event: ManagedEvent) {
    setImportId(String(event.id));
    setNotice("");
    importRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function save(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    if (!editing || pending) return;
    setPending(true);
    setError(null);
    const isNew = editing === "new";
    const res = await call<ManagedEvent>(`/api/admin/events${isNew ? "" : `?id=${editing.id}`}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        season_id: Number(draft.seasonId),
        name: draft.name.trim(),
        format: draft.format.trim(),
        played_at: new Date(draft.playedAt).toISOString(),
      }),
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEvents((prev) => (isNew ? [...prev, res.data] : prev.map((event) => (event.id === res.data.id ? res.data : event))));
    setNotice(isNew ? `Evento “${res.data.name}” creato.` : `Evento “${res.data.name}” aggiornato.`);
    close();
  }

  async function remove() {
    if (!deleting || pending) return;
    setPending(true);
    setError(null);
    const target = deleting;
    const res = await call<{ deleted_event_id: number }>(`/api/admin/events?id=${target.id}`, {
      method: "DELETE",
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEvents((prev) => prev.filter((event) => event.id !== target.id));
    setDeleting(null);
    if (editing !== "new" && editing?.id === target.id) close();
    if (importId === String(target.id)) setImportId("");
    setNotice(`Evento “${target.name}” eliminato.`);
  }

  const canSave = draft.seasonId !== "" && draft.name.trim() !== "" && draft.playedAt !== "";

  return (
    <>
      <DashboardHeading
        title="Eventi"
        description="Programma le tappe in anticipo: compaiono sul sito come prossimi eventi. A torneo finito, importa qui i risultati da melee.gg."
        action={
          <button type="button" className={PRIMARY} disabled={pending || editing === "new" || seasons.length === 0} onClick={() => open("new")}>
            Nuovo evento
          </button>
        }
      />

      {notice && <Notice>{notice}</Notice>}
      {error && !editing && <div className="mb-5"><ErrorPanel error={error} /></div>}

      {seasons.length === 0 && (
        <section role="alert" className="mb-5 rounded-2xl border border-accent bg-tint p-5">
          <h2 className="font-bold">Prima serve una stagione</h2>
          <p className="mt-2 text-sm text-ink/65">
            Ogni evento appartiene a una stagione.{" "}
            <Link href="/admin/seasons" className="font-bold text-accent">Creane una</Link> e poi torna qui.
          </p>
        </section>
      )}

      {deleting && (
        <ConfirmDelete
          name={deleting.name}
          description={
            deleting.has_results
              ? "L'evento ha risultati importati: verranno eliminati anche i suoi round, match e la classifica. I giocatori restano. L'operazione non è reversibile."
              : "L'evento non ha ancora risultati. L'operazione non è reversibile."
          }
          busy={pending}
          onCancel={() => setDeleting(null)}
          onConfirm={() => void remove()}
        />
      )}

      {editing && (
        <form onSubmit={save} className="card panel-in mb-6 p-5">
          <h2 className="text-[16px] font-extrabold uppercase tracking-[0.08em]">
            {editing === "new" ? "Nuovo evento" : `Modifica “${editing.name}”`}
          </h2>
          {editing !== "new" && editing.has_results && (
            <p className="mt-2 text-[12px] text-ink/50">
              I risultati importati non cambiano: qui modifichi solo nome, formato, data e stagione.
            </p>
          )}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Stagione" htmlFor={ids.season}>
              <select
                id={ids.season}
                className={`${CONTROL} ${fieldError("season_id") ? CONTROL_INVALID : ""}`}
                value={draft.seasonId}
                onChange={(event) => setDraft({ ...draft, seasonId: event.target.value })}
                required
                disabled={pending}
              >
                <option value="">Seleziona stagione</option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                    {season.is_active ? " · attiva" : ""}
                  </option>
                ))}
              </select>
              {fieldError("season_id") && <FieldError message={fieldError("season_id")!} />}
            </Field>
            <Field label="Nome" htmlFor={ids.name} hint="Includi «Tappa N»: il sito lo usa per numerare le tappe.">
              <input
                id={ids.name}
                className={`${CONTROL} ${fieldError("name") ? CONTROL_INVALID : ""}`}
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="Lega Pauper Milano Winter Edition - Tappa 1"
                required
                disabled={pending}
              />
              {fieldError("name") && <FieldError message={fieldError("name")!} />}
            </Field>
            <Field label="Formato" htmlFor={ids.format}>
              <input
                id={ids.format}
                className={CONTROL}
                value={draft.format}
                onChange={(event) => setDraft({ ...draft, format: event.target.value })}
                disabled={pending}
              />
            </Field>
            <Field label="Data e ora" htmlFor={ids.date}>
              <input
                id={ids.date}
                type="datetime-local"
                className={`${CONTROL} ${fieldError("played_at") ? CONTROL_INVALID : ""}`}
                value={draft.playedAt}
                onChange={(event) => setDraft({ ...draft, playedAt: event.target.value })}
                required
                disabled={pending}
              />
              {fieldError("played_at") && <FieldError message={fieldError("played_at")!} />}
            </Field>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="submit" className={PRIMARY} disabled={pending || !canSave}>
              {pending ? "Salvataggio…" : editing === "new" ? "Crea evento" : "Salva modifiche"}
            </button>
            <button type="button" className={ACTION} onClick={close} disabled={pending}>
              Annulla
            </button>
          </div>
          {error && <ErrorPanel error={error} />}
        </form>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label htmlFor={ids.filter} className="lbl">Stagione</label>
        <select
          id={ids.filter}
          className={`${CONTROL} !w-auto`}
          value={seasonFilter}
          onChange={(event) => { setSeasonFilter(event.target.value); setImportId(""); }}
        >
          <option value={ALL}>Tutte le stagioni</option>
          {seasons.map((season) => (
            <option key={season.id} value={season.id}>
              {season.name}
              {season.is_active ? " · attiva" : ""}
            </option>
          ))}
        </select>
        <span className="tn text-xs text-ink/45">
          {visible.length} eventi · {candidates.length} senza risultati
        </span>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-ink/10">
            <tr>
              <th className={HEAD_CELL}>Data</th>
              <th className={HEAD_CELL}>Evento</th>
              <th className={HEAD_CELL}>Stagione</th>
              <th className={HEAD_CELL}>Risultati</th>
              <th className={`${HEAD_CELL} text-right`}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((event) => (
              <tr key={event.id} className="border-b border-ink/8 last:border-b-0">
                <td className={`${CELL} tn whitespace-nowrap text-ink/70`}>{displayDateTime(event.played_at)}</td>
                <td className={CELL}>
                  <p className="font-bold">{event.name}</p>
                  <p className="tn mt-0.5 text-xs text-ink/45">
                    {event.format || "formato non indicato"} · id {event.id}
                  </p>
                </td>
                <td className={`${CELL} text-ink/70`}>{seasonName(event.season_id)}</td>
                <td className={CELL}>
                  {event.has_results ? <Badge tone="ink">Importati</Badge> : <Badge>Da importare</Badge>}
                </td>
                <td className={`${CELL} text-right`}>
                  <div className="flex flex-wrap justify-end gap-2">
                    {!event.has_results && (
                      <button type="button" className={ACTION_ACCENT} disabled={pending} onClick={() => startImport(event)}>
                        Importa
                      </button>
                    )}
                    <button type="button" className={ACTION} disabled={pending} onClick={() => open(event)}>
                      Modifica
                    </button>
                    <button type="button" className={ACTION} disabled={pending} onClick={() => { setDeleting(event); setNotice(""); }}>
                      Elimina
                    </button>
                    <Link href={`/events/${event.id}`} className={ACTION}>
                      Apri
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <EmptyState>
            {events.length === 0 ? "Nessun evento programmato." : "Nessun evento in questa stagione."}
          </EmptyState>
        )}
      </div>

      <div ref={importRef} className="mt-12 scroll-mt-24">
        <ImportForm candidates={candidates} eventId={importId} onEventId={setImportId} />
      </div>
    </>
  );
}
