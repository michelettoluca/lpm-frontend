"use client";

import { useId, useState } from "react";
import type { AdminError, Season } from "@/app/lib/adminTypes";
import { useAdmin } from "./AdminShell";
import { BUTTON, BUTTON_PRIMARY, Dialog, DIALOG_FORM, DialogBody, DialogFooter, localDate } from "./dashboardUi";
import { ErrorPanel, FieldError } from "./ErrorPanel";
import { CONTROL, CONTROL_INVALID, Field } from "./fields";

type Draft = { name: string; startedAt: string; endedAt: string; countedEvents: string };
const EMPTY: Draft = { name: "", startedAt: "", endedAt: "", countedEvents: "8" };

function toDraft(season: Season): Draft {
  return {
    name: season.name,
    startedAt: localDate(season.started_at),
    endedAt: season.ended_at ? localDate(season.ended_at) : "",
    countedEvents: season.counted_events == null ? "" : String(season.counted_events),
  };
}

/** Create a season (`season` null) or edit one. */
export function SeasonDialog({
  season,
  onClose,
  onSaved,
}: {
  season: Season | null;
  onClose: () => void;
  onSaved: (season: Season, isNew: boolean) => void;
}) {
  const { call } = useAdmin();
  const [draft, setDraft] = useState<Draft>(season ? toDraft(season) : EMPTY);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AdminError | null>(null);
  const ids = { name: useId(), start: useId(), end: useId(), counted: useId() };
  const isNew = season === null;

  const fieldError = (field: string) =>
    error?.kind === "bad_request" && error.field === field ? error.message : null;
  const intervalInvalid = draft.startedAt !== "" && draft.endedAt !== "" && draft.endedAt < draft.startedAt;
  const countedInvalid =
    draft.countedEvents !== "" && !(Number.isInteger(Number(draft.countedEvents)) && Number(draft.countedEvents) >= 1);
  const canSave = draft.name.trim() !== "" && !intervalInvalid && !countedInvalid;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (pending || !canSave) return;
    setPending(true);
    setError(null);
    // The API replaces the whole season on PUT: an omitted start keeps the
    // stored one, a null end reopens the season. On POST an omitted start is now.
    const res = await call<Season>(`/api/admin/seasons${isNew ? "" : `?id=${season.id}`}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.name.trim(),
        started_at: draft.startedAt || undefined,
        ended_at: draft.endedAt || null,
        counted_events: draft.countedEvents === "" ? null : Number(draft.countedEvents),
      }),
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSaved(res.data, isNew);
  }

  return (
    <Dialog title={isNew ? "Nuova stagione" : "Modifica stagione"} description={season?.name} busy={pending} onClose={onClose}>
      <form onSubmit={save} className={DIALOG_FORM}>
        <DialogBody>
          <Field label="Nome" htmlFor={ids.name}>
            <input
              id={ids.name}
              className={`${CONTROL} ${fieldError("name") ? CONTROL_INVALID : ""}`}
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="Eternal Weekend 2026"
              required
              autoFocus
              disabled={pending}
            />
            {fieldError("name") && <FieldError message={fieldError("name")!} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Inizio" htmlFor={ids.start}>
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
            <Field label="Fine" htmlFor={ids.end}>
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
          <p className="-mt-2 text-[12px] text-ink/45">
            {isNew ? "Inizio vuoto = oggi. " : ""}Lascia vuota la fine finché la stagione è in corso.
          </p>
          <Field label="Tappe valide" htmlFor={ids.counted}>
            <div className="flex items-center gap-3">
              <input
                id={ids.counted}
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                className={`${CONTROL} !w-24 ${fieldError("counted_events") || countedInvalid ? CONTROL_INVALID : ""}`}
                value={draft.countedEvents}
                onChange={(event) => setDraft({ ...draft, countedEvents: event.target.value })}
                disabled={pending}
              />
              <span className="text-[13px] text-ink/55">
                {draft.countedEvents === ""
                  ? "Contano tutte le tappe."
                  : "Migliori risultati di ogni giocatore che contano in classifica."}
              </span>
            </div>
            {countedInvalid && <FieldError message="Inserisci un numero intero da 1 in su, o lascia vuoto." />}
            {fieldError("counted_events") && <FieldError message={fieldError("counted_events")!} />}
          </Field>
          {error && !error.field && <ErrorPanel error={error} />}
        </DialogBody>
        <DialogFooter>
          <button type="button" className={BUTTON} onClick={onClose} disabled={pending}>
            Annulla
          </button>
          <button type="submit" className={BUTTON_PRIMARY} disabled={pending || !canSave}>
            {pending ? "Salvataggio…" : isNew ? "Crea stagione" : "Salva modifiche"}
          </button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
