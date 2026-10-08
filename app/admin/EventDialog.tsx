"use client";

import { useId, useState } from "react";
import type { AdminError, ManagedEvent } from "@/app/lib/adminTypes";
import { tappaNumber } from "@/app/lib/format";
import { meleeTournamentId } from "@/app/lib/melee";
import { useAdmin } from "./AdminShell";
import { BUTTON_PRIMARY, Dialog, DIALOG_FORM, DialogBody, DialogFooter, localDateTime } from "./dashboardUi";
import { ErrorPanel, FieldError } from "./ErrorPanel";
import { CONTROL, CONTROL_INVALID, Field } from "./fields";

type Draft = { seasonId: string; name: string; format: string; playedAt: string; melee: string };

/**
 * Tappe run weekly with the same name, so a new one most likely continues the
 * season's latest: next number, same time a week later.
 */
function nextInSeason(seasonId: number, seasonEvents: ManagedEvent[]): Draft {
  const last = [...seasonEvents].sort((a, b) => a.played_at.localeCompare(b.played_at)).at(-1);
  if (!last) return { seasonId: String(seasonId), name: "", format: "Pauper", playedAt: "", melee: "" };
  const n = tappaNumber(last.name);
  // A calendar week, not 7×24h, so the wall-clock time survives a DST change.
  const next = new Date(last.played_at);
  next.setDate(next.getDate() + 7);
  return {
    seasonId: String(seasonId),
    name: n === null ? "" : last.name.replace(/Tappa\s+\d+/i, `Tappa ${n + 1}`),
    format: last.format ?? "Pauper",
    playedAt: localDateTime(next.toISOString()),
    melee: "",
  };
}

/** Schedule an event in `seasonId` (`event` null) or edit one. */
export function EventDialog({
  event,
  seasonId,
  onClose,
  onSaved,
}: {
  event: ManagedEvent | null;
  seasonId: number;
  onClose: () => void;
  onSaved: (event: ManagedEvent, isNew: boolean) => void;
}) {
  const { seasons, events, call } = useAdmin();
  const isNew = event === null;
  const [draft, setDraft] = useState<Draft>(() =>
    event
      ? {
          seasonId: String(event.season_id),
          name: event.name,
          format: event.format ?? "",
          playedAt: localDateTime(event.played_at),
          melee: event.melee_tournament_id ? String(event.melee_tournament_id) : "",
        }
      : nextInSeason(seasonId, events.filter((e) => e.season_id === seasonId)),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AdminError | null>(null);
  const ids = { season: useId(), name: useId(), format: useId(), date: useId(), melee: useId() };
  const meleeId = meleeTournamentId(draft.melee);
  const meleeInvalid = draft.melee.trim() !== "" && meleeId === null;
  // Imported results fix the tournament they came from.
  const meleeLocked = event?.has_results ?? false;

  const fieldError = (field: string) =>
    error?.kind === "bad_request" && error.field === field ? error.message : null;
  // A 400 about a field this dialog doesn't render still has to surface.
  const shownFields: string[] = isNew ? ["name", "played_at"] : ["name", "played_at", "season_id"];
  const canSave = draft.seasonId !== "" && draft.name.trim() !== "" && draft.playedAt !== "" && !meleeInvalid;

  async function save(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    if (pending || !canSave) return;
    setPending(true);
    setError(null);
    const res = await call<ManagedEvent>(`/api/admin/events${isNew ? "" : `?id=${event.id}`}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        season_id: Number(draft.seasonId),
        name: draft.name.trim(),
        format: draft.format.trim(),
        played_at: new Date(draft.playedAt).toISOString(),
        ...(meleeLocked ? {} : { melee_tournament_id: meleeId }),
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
    <Dialog
      title={isNew ? "Nuova tappa" : "Modifica tappa"}
      description={
        isNew
          ? "Compare subito sul sito tra i prossimi eventi."
          : event.has_results
            ? "I risultati importati non cambiano: qui modifichi solo nome, formato, data e stagione."
            : event.name
      }
      busy={pending}
      onClose={onClose}
    >
      <form onSubmit={save} className={DIALOG_FORM}>
        <DialogBody>
          <Field label="Nome" htmlFor={ids.name} hint="Includi «Tappa N»: il sito lo usa per numerare le tappe.">
            <input
              id={ids.name}
              className={`${CONTROL} ${fieldError("name") ? CONTROL_INVALID : ""}`}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Lega Pauper Milano Winter Edition - Tappa 1"
              required
              autoFocus
              disabled={pending}
            />
            {fieldError("name") && <FieldError message={fieldError("name")!} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Field label="Data e ora" htmlFor={ids.date}>
              <input
                id={ids.date}
                type="datetime-local"
                className={`${CONTROL} ${fieldError("played_at") ? CONTROL_INVALID : ""}`}
                value={draft.playedAt}
                onChange={(e) => setDraft({ ...draft, playedAt: e.target.value })}
                required
                disabled={pending}
              />
              {fieldError("played_at") && <FieldError message={fieldError("played_at")!} />}
            </Field>
            <Field label="Formato" htmlFor={ids.format}>
              <input
                id={ids.format}
                className={CONTROL}
                value={draft.format}
                onChange={(e) => setDraft({ ...draft, format: e.target.value })}
                disabled={pending}
              />
            </Field>
          </div>
          <Field
            label="Torneo Melee"
            htmlFor={ids.melee}
            hint={
              meleeLocked
                ? "I risultati vengono da questo torneo: per cambiarlo reimposta prima i risultati."
                : "ID o link del torneo su melee.gg. Senza, la tappa non si può mettere in corso né importare."
            }
          >
            <input
              id={ids.melee}
              className={`${CONTROL} ${meleeInvalid ? CONTROL_INVALID : ""}`}
              value={draft.melee}
              onChange={(e) => setDraft({ ...draft, melee: e.target.value })}
              inputMode="url"
              placeholder="475829 o https://melee.gg/Tournament/View/475829"
              disabled={pending || meleeLocked}
            />
            {meleeInvalid && <FieldError message="Serve il numero del torneo o il suo link melee.gg/Tournament/View/…" />}
          </Field>
          {!isNew && (
            <Field label="Stagione" htmlFor={ids.season}>
              <select
                id={ids.season}
                className={`${CONTROL} ${fieldError("season_id") ? CONTROL_INVALID : ""}`}
                value={draft.seasonId}
                onChange={(e) => setDraft({ ...draft, seasonId: e.target.value })}
                required
                disabled={pending}
              >
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                    {season.is_active ? " · attiva" : ""}
                  </option>
                ))}
              </select>
              {fieldError("season_id") && <FieldError message={fieldError("season_id")!} />}
            </Field>
          )}
          {error && !(error.field && shownFields.includes(error.field)) && <ErrorPanel error={error} />}
        </DialogBody>
        <DialogFooter>
          <button type="submit" className={BUTTON_PRIMARY} disabled={pending || !canSave}>
            {pending ? "Salvataggio…" : isNew ? "Crea tappa" : "Salva modifiche"}
          </button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
