"use client";

import Link from "next/link";
import { useState } from "react";
import type { AdminError, ImportResult, ManagedEvent } from "@/app/lib/adminTypes";
import { meleeTournamentId, meleeTournamentUrl } from "@/app/lib/melee";
import { useAdmin } from "../../AdminShell";
import { startTappa } from "../../declarations/shared";
import { ErrorPanel } from "../../ErrorPanel";
import { BUTTON, BUTTON_GHOST, BUTTON_PRIMARY, notify } from "../../dashboardUi";
import { isPast, useIsLive } from "../../eventDisplay";
import { CONTROL, CONTROL_INVALID } from "../../fields";

/**
 * A tappa before its results: the Melee tournament it is played as, and the
 * two things that hang on it. Putting it in progress opens the deck
 * collection on that tournament; importing takes its results, in one click.
 */
export function MeleeTournament({ event }: { event: ManagedEvent }) {
  const { call, setEvents, refresh, live: current, setLive } = useAdmin();
  const live = useIsLive(event);
  const id = event.melee_tournament_id ?? null;
  const [editing, setEditing] = useState(id === null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<"save" | "live" | "import" | null>(null);
  const [error, setError] = useState<AdminError | null>(null);
  const parsed = meleeTournamentId(text);
  const invalid = text.trim() !== "" && parsed === null;

  async function save(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    if (parsed === null || busy) return;
    setBusy("save");
    setError(null);
    const res = await call<ManagedEvent>(`/api/admin/events?id=${event.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        season_id: event.season_id,
        name: event.name,
        format: event.format ?? "",
        played_at: event.played_at,
        melee_tournament_id: parsed,
      }),
    });
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEvents((prev) => prev.map((e) => (e.id === res.data.id ? res.data : e)));
    // The tournament already in progress may be the one just set: it is this tappa's now.
    if (current && current.id === parsed) setLive({ ...current, event_id: event.id });
    setText("");
    setEditing(false);
    notify("Torneo Melee associato alla tappa.");
  }

  async function putLive() {
    setBusy("live");
    setError(null);
    const res = await startTappa(call, event.id);
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (res.data) setLive(res.data);
    notify(
      <>
        Tappa in corso: i giocatori possono indicare il mazzo.{" "}
        <Link href="/admin/declarations" className="text-accent underline-offset-2 hover:underline">
          Torneo in corso →
        </Link>
      </>,
    );
  }

  async function importResults() {
    setBusy("import");
    setError(null);
    const res = await call<ImportResult>("/api/admin/import/melee-api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: event.id }),
    });
    if (!res.ok) {
      setBusy(null);
      setError(res.error);
      return;
    }
    // The page turns into the standings with their decks.
    await refresh();
    setBusy(null);
    notify("Risultati importati da melee.gg, con i mazzi raccolti durante la serata.");
  }

  return (
    <section className="card max-w-3xl p-5">
      <h2 className="text-[19px] font-semibold">Torneo Melee</h2>
      <p className="mt-1 text-[15px] leading-relaxed text-ink/60">
        Il torneo su melee.gg di questa tappa. Serve per raccogliere i mazzi durante la serata e per importare i
        risultati.
      </p>

      {editing ? (
        <form onSubmit={save} className="mt-4">
          <div className="flex max-w-xl gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={busy !== null}
              inputMode="url"
              autoFocus={id !== null}
              aria-label="ID o link del torneo Melee"
              aria-invalid={invalid}
              placeholder="ID o link del torneo, es. 475829"
              className={`${CONTROL} ${invalid ? CONTROL_INVALID : ""}`}
            />
            <button type="submit" className={BUTTON_PRIMARY} disabled={busy !== null || parsed === null}>
              {busy === "save" ? "Salvo…" : "Salva"}
            </button>
            {id !== null && (
              <button type="button" className={BUTTON_GHOST} onClick={() => setEditing(false)} disabled={busy !== null}>
                Annulla
              </button>
            )}
          </div>
          <p className={`mt-2 text-[13px] ${invalid ? "text-accent" : "text-ink/50"}`}>
            {invalid
              ? "Serve il numero del torneo o il suo link melee.gg/Tournament/View/…"
              : "Lo trovi nel link del torneo su melee.gg, dopo /Tournament/View/."}
          </p>
        </form>
      ) : (
        id !== null && (
          <>
            <p className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <a
                href={meleeTournamentUrl(id)}
                target="_blank"
                rel="noopener"
                className="tn font-[family-name:var(--font-archivo)] text-[22px] font-bold hover:text-accent"
              >
                {id} ↗
              </a>
              {!live && (
                <button
                  type="button"
                  className="text-[14px] font-medium text-ink/55 hover:text-ink"
                  onClick={() => setEditing(true)}
                >
                  Cambia
                </button>
              )}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={isPast(event) ? BUTTON_PRIMARY : BUTTON}
                onClick={() => void importResults()}
                disabled={busy !== null}
              >
                {busy === "import" ? "Importo da melee.gg…" : "Importa risultati"}
              </button>
              {live ? (
                <Link href="/admin/declarations" className={BUTTON}>
                  In corso: vai ai mazzi →
                </Link>
              ) : (
                <button
                  type="button"
                  className={isPast(event) ? BUTTON : BUTTON_PRIMARY}
                  onClick={() => void putLive()}
                  disabled={busy !== null}
                >
                  {busy === "live" ? "Attendi…" : "Metti in corso"}
                </button>
              )}
            </div>
            <p className="mt-3 text-[13px] text-ink/50">
              {isPast(event)
                ? "Importa quando il torneo su melee.gg è concluso: classifica, turni e mazzi arrivano insieme."
                : "La sera della tappa mettila in corso: i giocatori indicano il mazzo da /mazzo e tu completi ai tavoli."}
            </p>
          </>
        )
      )}

      {error && (
        <div className="mt-4">
          <ErrorPanel error={error} />
        </div>
      )}
    </section>
  );
}
