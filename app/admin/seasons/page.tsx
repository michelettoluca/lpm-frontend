"use client";

import { useId, useState } from "react";
import type { AdminError, Season } from "@/app/lib/adminTypes";
import { useAdmin } from "../AdminShell";
import { ConfirmResetDialog } from "../ConfirmResetDialog";
import { DangerZone } from "../DangerZone";
import { ErrorPanel, FieldError } from "../ErrorPanel";
import { CONTROL, CONTROL_INVALID, Field } from "../fields";
import {
  ACTION,
  ACTION_ACCENT,
  Badge,
  CELL,
  ConfirmAction,
  DashboardHeading,
  displayDate,
  EmptyState,
  HEAD_CELL,
  localDate,
  Notice,
  PRIMARY,
} from "../dashboardUi";

type Draft = { name: string; startedAt: string; endedAt: string };
const EMPTY: Draft = { name: "", startedAt: "", endedAt: "" };

function toDraft(season: Season): Draft {
  return {
    name: season.name,
    startedAt: localDate(season.started_at),
    endedAt: season.ended_at ? localDate(season.ended_at) : "",
  };
}

export default function SeasonsPage() {
  const { seasons, events, setSeasons, setEvents, call } = useAdmin();
  const [editing, setEditing] = useState<Season | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [activating, setActivating] = useState<Season | null>(null);
  const [deleting, setDeleting] = useState<Season | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AdminError | null>(null);
  const [notice, setNotice] = useState("");
  const ids = { name: useId(), start: useId(), end: useId() };

  const eventCount = (seasonId: number) => events.filter((event) => event.season_id === seasonId).length;
  const fieldError = (field: string) =>
    error?.kind === "bad_request" && error.field === field ? error.message : null;
  const intervalInvalid = draft.startedAt !== "" && draft.endedAt !== "" && draft.endedAt < draft.startedAt;

  function open(target: Season | "new") {
    setEditing(target);
    setDraft(target === "new" ? EMPTY : toDraft(target));
    setActivating(null);
    setError(null);
    setNotice("");
  }

  function close() {
    setEditing(null);
    setDraft(EMPTY);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing || pending || intervalInvalid) return;
    setPending(true);
    setError(null);
    const isNew = editing === "new";
    // The API replaces the whole season on PUT: an omitted start keeps the
    // stored one, a null end reopens the season. On POST an omitted start is now.
    const res = await call<Season>(`/api/admin/seasons${isNew ? "" : `?id=${editing.id}`}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.name.trim(),
        started_at: draft.startedAt || undefined,
        ended_at: draft.endedAt || null,
      }),
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSeasons((prev) =>
      isNew ? [res.data, ...prev] : prev.map((season) => (season.id === res.data.id ? res.data : season)),
    );
    setNotice(isNew ? `Stagione “${res.data.name}” creata.` : `Stagione “${res.data.name}” aggiornata.`);
    close();
  }

  async function activate() {
    if (!activating || pending) return;
    setPending(true);
    setError(null);
    const target = activating;
    const res = await call<Season>(`/api/admin/seasons?id=${target.id}&active=true`, { method: "PUT" });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSeasons((prev) => prev.map((item) => ({ ...item, is_active: item.id === target.id })));
    setActivating(null);
    setNotice(`“${target.name}” è ora la stagione attiva: il sito pubblico mostra la sua classifica e i suoi eventi.`);
  }

  async function remove() {
    if (!deleting || pending) return;
    setPending(true);
    setError(null);
    const target = deleting;
    const res = await call<{ deleted_season_id: number }>(`/api/admin/seasons?id=${target.id}`, {
      method: "DELETE",
    });
    setPending(false);
    setDeleting(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setSeasons((prev) => prev.filter((season) => season.id !== target.id));
    setEvents((prev) => prev.filter((event) => event.season_id !== target.id));
    if (editing !== "new" && editing?.id === target.id) close();
    setNotice(`Stagione “${target.name}” eliminata.`);
  }

  const hasActive = seasons.some((season) => season.is_active);

  return (
    <>
      <DashboardHeading
        title="Stagioni"
        description="Le stagioni raggruppano le tappe. La stagione attiva è quella che il sito pubblico mostra in home, in classifica e nelle pagine dei giocatori."
        action={
          <button type="button" className={PRIMARY} disabled={pending || editing === "new"} onClick={() => open("new")}>
            Nuova stagione
          </button>
        }
      />

      {notice && <Notice>{notice}</Notice>}
      {error && !editing && <div className="mb-5"><ErrorPanel error={error} /></div>}

      {seasons.length > 0 && !hasActive && (
        <section role="alert" className="mb-5 rounded-2xl border border-accent bg-tint p-5">
          <h2 className="font-bold">Nessuna stagione attiva</h2>
          <p className="mt-2 text-sm text-ink/65">
            Il sito pubblico non ha una classifica da mostrare finché non ne scegli una con «Rendi attiva».
          </p>
        </section>
      )}

      {activating && (
        <ConfirmAction
          title={`Rendere attiva “${activating.name}”?`}
          description={
            hasActive
              ? "Il sito pubblico passa subito a questa stagione: home, classifica e pagine dei giocatori mostreranno i suoi dati."
              : "Il sito pubblico tornerà a mostrare una classifica, quella di questa stagione."
          }
          confirmLabel="Rendi attiva"
          busy={pending}
          onCancel={() => setActivating(null)}
          onConfirm={() => void activate()}
        />
      )}

      {editing && (
        <form onSubmit={save} className="card panel-in mb-6 p-5">
          <h2 className="text-[16px] font-extrabold uppercase tracking-[0.08em]">
            {editing === "new" ? "Nuova stagione" : `Modifica “${editing.name}”`}
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <Field label="Nome" htmlFor={ids.name}>
              <input
                id={ids.name}
                className={`${CONTROL} ${fieldError("name") ? CONTROL_INVALID : ""}`}
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                placeholder="Season 2027"
                required
                disabled={pending}
              />
              {fieldError("name") && <FieldError message={fieldError("name")!} />}
            </Field>
            <Field label="Inizio" htmlFor={ids.start} hint={editing === "new" ? "Vuoto = oggi." : undefined}>
              <input
                id={ids.start}
                type="date"
                className={`${CONTROL} ${fieldError("started_at") ? CONTROL_INVALID : ""}`}
                value={draft.startedAt}
                onChange={(event) => setDraft({ ...draft, startedAt: event.target.value })}
                disabled={pending}
              />
              {fieldError("started_at") && <FieldError message={fieldError("started_at")!} />}
            </Field>
            <Field label="Fine" htmlFor={ids.end} hint="Lascia vuoto finché la stagione è in corso.">
              <input
                id={ids.end}
                type="date"
                className={`${CONTROL} ${fieldError("ended_at") || intervalInvalid ? CONTROL_INVALID : ""}`}
                value={draft.endedAt}
                min={draft.startedAt || undefined}
                onChange={(event) => setDraft({ ...draft, endedAt: event.target.value })}
                disabled={pending}
              />
              {intervalInvalid && <FieldError message="La fine deve essere uguale o successiva all'inizio." />}
              {fieldError("ended_at") && <FieldError message={fieldError("ended_at")!} />}
            </Field>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="submit" className={PRIMARY} disabled={pending || !draft.name.trim() || intervalInvalid}>
              {pending ? "Salvataggio…" : editing === "new" ? "Crea stagione" : "Salva modifiche"}
            </button>
            <button type="button" className={ACTION} onClick={close} disabled={pending}>
              Annulla
            </button>
          </div>
          {error && <ErrorPanel error={error} />}
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-ink/10">
            <tr>
              <th className={HEAD_CELL}>Stagione</th>
              <th className={HEAD_CELL}>Periodo</th>
              <th className={HEAD_CELL}>Eventi</th>
              <th className={HEAD_CELL}>Stato</th>
              <th className={`${HEAD_CELL} text-right`}>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {seasons.map((season) => (
              <tr key={season.id} className="border-b border-ink/8 last:border-b-0">
                <td className={CELL}>
                  <p className="font-bold">{season.name}</p>
                  <p className="tn mt-0.5 text-xs text-ink/45">id {season.id}</p>
                </td>
                <td className={`${CELL} tn whitespace-nowrap text-ink/70`}>
                  {displayDate(season.started_at)}
                  {" → "}
                  {season.ended_at ? displayDate(season.ended_at) : "in corso"}
                </td>
                <td className={`${CELL} tn`}>{eventCount(season.id)}</td>
                <td className={CELL}>
                  {season.is_active ? (
                    <Badge tone="accent">Attiva</Badge>
                  ) : season.ended_at ? (
                    <Badge>Conclusa</Badge>
                  ) : (
                    <Badge tone="ink">In corso</Badge>
                  )}
                </td>
                <td className={`${CELL} text-right`}>
                  <div className="flex flex-wrap justify-end gap-2">
                    {!season.is_active && (
                      <button
                        type="button"
                        className={ACTION_ACCENT}
                        disabled={pending}
                        onClick={() => { setActivating(season); setNotice(""); }}
                      >
                        Rendi attiva
                      </button>
                    )}
                    <button type="button" className={ACTION} disabled={pending} onClick={() => open(season)}>
                      Modifica
                    </button>
                    <button type="button" className={ACTION} disabled={pending} onClick={() => { setDeleting(season); setNotice(""); }}>
                      Elimina
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {seasons.length === 0 && <EmptyState>Nessuna stagione. Creane una per poter programmare gli eventi.</EmptyState>}
      </div>

      <ConfirmResetDialog
        open={deleting !== null}
        word="ELIMINA"
        title={`Elimina “${deleting?.name ?? ""}”`}
        confirmLabel="Elimina stagione"
        pending={pending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void remove()}
      >
        {deleting && eventCount(deleting.id) > 0 ? (
          <p>
            Verranno eliminati anche i suoi <strong>{eventCount(deleting.id)} eventi</strong> con tutti i
            match e le classifiche. I giocatori restano.
          </p>
        ) : (
          <p>La stagione non ha eventi.</p>
        )}
        {deleting?.is_active && (
          <p>È la stagione attiva: il sito pubblico resterà senza classifica finché non ne scegli un&apos;altra.</p>
        )}
        <p>L&apos;operazione non è reversibile.</p>
      </ConfirmResetDialog>

      <DangerZone />
    </>
  );
}
