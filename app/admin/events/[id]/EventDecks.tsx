"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminError } from "@/app/lib/adminTypes";
import { ManaCost } from "@/app/components/ArchetypePicker";
import { archetypeLabel, UNAVAILABLE, type Archetype } from "@/app/lib/decks";
import { useAdmin } from "../../AdminShell";
import { ErrorPanel } from "../../ErrorPanel";
import { DeckDialog } from "../../declarations/shared";
import {
  Badge,
  BUTTON,
  BUTTON_GHOST,
  ConfirmDialog,
  EmptyState,
  notify,
  Pagination,
  rowOpens,
  SectionHeader,
  TABLE,
  TD,
  TH,
  usePage,
} from "../../dashboardUi";

type Deck = { archetype_id: number; archetype_name: string; source?: "declaration" | "admin" | "lpi" };

type Row = {
  rank: number;
  player_id: number;
  player_name: string;
  points: number;
  wins: number;
  losses: number;
  draws: number;
  byes: number;
  /** The deck on the tappa, which the statistics count. */
  deck: Deck | null;
  /** What the player indicated during the night. */
  collected: Deck | null;
};

type Results = {
  tournament_id: number | null;
  rows: Row[];
  unmatched: { player_name: string; username: string; archetype_name: string }[];
};

/**
 * Who played what at the tappa: every player in the standings with their
 * deck, which the public page and the statistics read. Importing the results
 * copies the decks indicated during the night; Sincronizza copies them again
 * for players still without one, and any deck can be set by hand.
 */
export function EventDecks({ eventId, eventName }: { eventId: number; eventName: string }) {
  const { call } = useAdmin();
  const [results, setResults] = useState<Results | null>(null);
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [error, setError] = useState<AdminError | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [busy, setBusy] = useState(false);
  const { rows, pager } = usePage(results?.rows ?? []);

  const load = useCallback(async () => {
    const res = await call<Results>(`/api/admin/events/${eventId}/decks`);
    if (res.ok) setResults(res.data);
    else setError(res.error);
  }, [call, eventId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
    void load();
    // The admin list includes blacklisted archetypes: admins can still set one.
    void call<Archetype[]>("/api/admin/archetypes").then((res) => res.ok && setArchetypes(res.data));
  }, [call, load]);

  async function sync(overwrite: boolean) {
    setBusy(true);
    const res = await call<{ updated: number }>(`/api/admin/events/${eventId}/decks/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overwrite }),
    });
    setBusy(false);
    setConfirmOverwrite(false);
    if (!res.ok) return setError(res.error);
    const n = res.data.updated;
    notify(n === 0 ? "Nessun mazzo da aggiornare." : n === 1 ? "1 mazzo aggiornato." : `${n} mazzi aggiornati.`);
    await load();
  }

  async function save(row: Row, archetype: Archetype | null) {
    setBusy(true);
    const res = await call(`/api/admin/events/${eventId}/decks/${row.player_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archetype_id: archetype?.id ?? null }),
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setEditing(null);
    notify(archetype ? `${row.player_name}: ${archetypeLabel(archetype.name)}.` : `Mazzo di ${row.player_name} rimosso.`);
    await load();
  }

  if (error) return <ErrorPanel error={error} />;
  if (!results) return <p className="py-6 text-[15px] text-ink/50">Carico i mazzi…</p>;

  const fromMelee = results.tournament_id !== null;
  const withDeck = results.rows.filter((r) => r.deck).length;
  const toCopy = results.rows.filter((r) => r.collected && !r.deck).length;
  const archetypeOf = (d: Deck) => archetypes.find((a) => a.id === d.archetype_id);

  return (
    <section>
      <SectionHeader
        title="Mazzi"
        aside={results.rows.length > 0 ? `${withDeck}/${results.rows.length} con mazzo` : undefined}
        action={
          results.rows.length > 0 && (
            <div className="flex flex-wrap justify-end gap-2">
              {fromMelee && (
                <button type="button" className={BUTTON} disabled={busy} onClick={() => void sync(false)}>
                  {busy ? "Attendi…" : toCopy > 0 ? `Sincronizza (${toCopy})` : "Sincronizza"}
                </button>
              )}
              <button type="button" className={BUTTON_GHOST} onClick={() => exportCsv(results, eventName)}>
                Esporta CSV
              </button>
            </div>
          )
        }
      />
      <p className="mb-3 text-[13px] text-ink/50">
        {fromMelee
          ? "All'import ogni giocatore riceve il mazzo indicato durante la serata. Sincronizza copia quelli arrivati dopo, senza toccare le correzioni. Tocca una riga per cambiare il mazzo."
          : "La tappa non viene da un torneo Melee: i mazzi si inseriscono a mano. Tocca una riga per scegliere il mazzo."}
      </p>

      {results.rows.length === 0 ? (
        <section className="card">
          <EmptyState>La tappa non ha ancora una classifica.</EmptyState>
        </section>
      ) : (
        <div className="card overflow-x-auto">
          <table className={TABLE}>
            <thead>
              <tr>
                <th className={`${TH} w-px text-right`}>#</th>
                <th className={TH}>Giocatore</th>
                <th className={`${TH} hidden w-px whitespace-nowrap sm:table-cell`}>V-P-P</th>
                <th className={TH}>Mazzo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const archetype = r.deck && archetypeOf(r.deck);
                const differs = r.collected && r.collected.archetype_id !== r.deck?.archetype_id;
                return (
                  <tr key={r.player_id} {...rowOpens(() => setEditing(r))}>
                    <td className={`${TD} tn w-px text-right text-ink/50`}>{r.rank}</td>
                    <td className={`${TD} max-w-0 truncate font-medium`}>{r.player_name}</td>
                    <td className={`${TD} tn hidden whitespace-nowrap text-ink/55 sm:table-cell`}>
                      {r.wins + r.byes}-{r.losses}-{r.draws}
                    </td>
                    <td className={`${TD} py-1.5`}>
                      {r.deck ? (
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate">{archetypeLabel(r.deck.archetype_name)}</span>
                          {archetype && <ManaCost archetype={archetype} small />}
                          {r.deck.source === "admin" && <Badge>a mano</Badge>}
                          {r.deck.source === "lpi" && <Badge>LPI</Badge>}
                        </span>
                      ) : (
                        <span className="text-ink/35">—</span>
                      )}
                      {differs && (
                        <span className="block truncate text-[13px] text-ink/45">indicato: {archetypeLabel(r.collected!.archetype_name)}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pagination {...pager} />
        </div>
      )}

      {fromMelee && results.rows.some((r) => r.deck?.source === "admin" && r.collected) && (
        <button
          type="button"
          className={`${BUTTON_GHOST} mt-2 -ml-2 text-[13px]`}
          disabled={busy}
          onClick={() => setConfirmOverwrite(true)}
        >
          Rimetti i mazzi indicati anche dove li hai corretti
        </button>
      )}

      {results.unmatched.length > 0 && (
        <details className="mt-3 text-[15px]">
          <summary className="cursor-pointer text-ink/60 hover:text-ink">
            {results.unmatched.length === 1
              ? "1 mazzo indicato non corrisponde a nessun giocatore in classifica"
              : `${results.unmatched.length} mazzi indicati non corrispondono a nessun giocatore in classifica`}
          </summary>
          <p className="mt-2 text-[13px] text-ink/50">
            Di solito sono giocatori ritirati prima del primo turno. Se invece manca qualcuno che ha giocato, il suo
            account Melee non è collegato al giocatore della classifica: scegli il suo mazzo a mano.
          </p>
          <ul className="mt-2 space-y-1">
            {results.unmatched.map((u) => (
              <li key={`${u.username}-${u.player_name}`} className="flex justify-between gap-3">
                <span className="truncate">
                  {u.player_name} {u.username && <span className="text-ink/45">· {u.username}</span>}
                </span>
                <span className="shrink-0 text-ink/60">{archetypeLabel(u.archetype_name)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {editing && (
        <DeckDialog
          title={editing.player_name}
          description={
            editing.collected
              ? `Indicato durante la serata: ${archetypeLabel(editing.collected.archetype_name)}`
              : "Nessun mazzo indicato durante la serata"
          }
          current={editing.deck}
          archetypes={archetypes}
          busy={busy}
          onSave={(a) => void save(editing, a)}
          onClose={() => setEditing(null)}
        />
      )}
      {confirmOverwrite && (
        <ConfirmDialog
          title="Rimettere i mazzi indicati?"
          confirmLabel="Rimetti"
          busy={busy}
          onCancel={() => setConfirmOverwrite(false)}
          onConfirm={() => void sync(true)}
        >
          <p>
            Ogni giocatore torna al mazzo indicato durante la serata, anche dove l&apos;hai corretto a mano. Chi non ha
            indicato nulla resta com&apos;è.
          </p>
        </ConfirmDialog>
      )}
    </section>
  );
}

/** Standings with decks; a player without one is Non Disponibile, as Lega Pauper Italia counts them. */
function exportCsv(results: Results, eventName: string) {
  const quote = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [
    ["Posizione", "Giocatore", "Punti", "Vittorie", "Sconfitte", "Pareggi", "Bye", "Archetipo", "ID archetipo LPI"],
    ...results.rows.map((r) => [
      r.rank,
      r.player_name,
      r.points,
      r.wins,
      r.losses,
      r.draws,
      r.byes,
      r.deck?.archetype_name ?? UNAVAILABLE,
      r.deck?.archetype_id ?? "",
    ]),
  ];
  const csv = rows.map((r) => r.map(quote).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `mazzi-${eventName.replace(/[^\w-]+/g, "-").toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
