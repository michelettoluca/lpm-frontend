"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ManaCost } from "@/app/components/ArchetypePicker";
import { archetypeLabel, type Archetype } from "@/app/lib/decks";
import { ErrorPanel } from "../../ErrorPanel";
import { BUTTON, BUTTON_PRIMARY, EmptyState } from "../../dashboardUi";
import {
  DeckPickerDialog,
  EndCard,
  fillOf,
  TableStrip,
  tableTitle,
  useDeclarations,
  useWalk,
  type Seat,
} from "../shared";

/**
 * Walking the room to fill in decks, on one screen with nothing else on it:
 * the tables in a row at the top, the current table's players filling the
 * rest, and the navigation pinned at the bottom. Once a table has both decks
 * it moves on to the next table still missing one by itself, with a toast to
 * go back if needed.
 */
export default function TableWalkPage() {
  const { view, archetypes, error, busy, walk, setDeck } = useDeclarations();
  const { at, setAt, index, table, next, previous } = useWalk(walk, view?.round?.number ?? null);
  const [picking, setPicking] = useState<Seat | null>(null);

  async function save(seat: Seat, archetype: Archetype | null) {
    if (!table || !(await setDeck(seat, archetype))) return;
    setPicking(null);
    const complete = archetype !== null && table.seats.every((s) => s.team_id === seat.team_id || s.declaration);
    if (complete) {
      const done = table.number;
      next();
      toast.success(`${tableTitle(done)} completo`, {
        action: { label: "Torna indietro", onClick: () => setAt(done) },
      });
    }
  }

  const t = view?.tournament;
  const active = view?.players.filter((p) => !p.dropped) ?? [];
  const declaredCount = active.filter((p) => p.declaration).length;
  const ready = view && t && walk.length > 0;

  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-[960px] flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-ink/10 px-4">
        <Link href="/admin/declarations" className="shrink-0 text-[13px] text-ink/60 hover:text-ink">
          ← Archetipi
        </Link>
        <p className="min-w-0 truncate text-[13px] text-ink/60">
          {view?.round && view.round.number > 0 && <span className="font-medium text-ink">Turno {view.round.number}</span>}
          {t && (
            <span className="tn">
              {" "}
              · {declaredCount}/{active.length} con mazzo
            </span>
          )}
        </p>
      </header>

      {error && (
        <div className="shrink-0 px-4 pt-3">
          <ErrorPanel error={error} />
        </div>
      )}

      {!ready ? (
        <div className="px-4 pt-4">
          {!view ? (
            !error && <p className="py-16 text-center text-[13px] text-ink/50">Caricamento…</p>
          ) : (
            <section className="card">
              <EmptyState>
                {!t
                  ? "Nessun torneo aperto: sceglilo da Archetipi."
                  : view.round && view.round.number > 0 && !view.round.published
                    ? `Gli abbinamenti del turno ${view.round.number} non sono ancora pubblicati su Melee.`
                    : "Il primo turno non è ancora abbinato."}
              </EmptyState>
            </section>
          )}
        </div>
      ) : (
        <>
          <div className="shrink-0 px-4 pt-3">
            <TableStrip walk={walk} at={at} onGo={setAt} legend={false} />
          </div>

          {table ? (
            <>
              <div className="flex shrink-0 items-baseline justify-between px-4 pt-4 pb-2">
                <h1 className="text-[20px] font-semibold">{tableTitle(table.number)}</h1>
                <span className="tn text-[12px] text-ink/45">
                  {index + 1} di {walk.length}
                </span>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-3 sm:flex-row">
                {table.seats.map((seat) => (
                  <SeatBox key={seat.team_id} seat={seat} archetypes={archetypes} onPick={() => setPicking(seat)} />
                ))}
              </div>
            </>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4">
              <EndCard walk={walk} onGo={setAt} />
            </div>
          )}

          <footer className="flex shrink-0 gap-2 border-t border-ink/10 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            <button type="button" className={`${BUTTON} h-11 px-4`} onClick={previous} disabled={index <= 0}>
              ← Precedente
            </button>
            <button type="button" className={`${BUTTON_PRIMARY} h-11 flex-1`} onClick={next} disabled={!table}>
              {table && fillOf(table) === "full" ? "Avanti →" : "Salta →"}
            </button>
          </footer>
        </>
      )}

      {picking && (
        <DeckPickerDialog
          key={picking.team_id}
          seat={picking}
          archetypes={archetypes}
          busy={busy}
          onClose={() => setPicking(null)}
          onSave={(archetype) => void save(picking, archetype)}
        />
      )}
    </div>
  );
}

/** One player of the table, as a large box: name at the top, the deck or the button to choose it at the bottom. */
function SeatBox({ seat, archetypes, onPick }: { seat: Seat; archetypes: Archetype[]; onPick: () => void }) {
  const d = seat.declaration;
  const archetype = d ? archetypes.find((a) => a.id === d.archetype_id) : undefined;
  return (
    <button
      type="button"
      onClick={onPick}
      className={`card flex min-h-[132px] flex-1 flex-col justify-between gap-4 p-5 text-left transition-colors hover:border-ink/25 ${
        d ? "" : "border-dashed"
      }`}
    >
      <span className="min-w-0">
        <span className="block text-[20px] leading-tight font-semibold break-words">{seat.name}</span>
        {seat.username && <span className="mt-1 block truncate text-[13px] text-ink/45">{seat.username}</span>}
      </span>
      {d ? (
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2 text-[17px] font-medium">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#22c55e]" aria-hidden />
            {archetypeLabel(d.archetype_name)}
            {archetype && <ManaCost archetype={archetype} />}
          </span>
          <span className="mt-1 block text-[13px] text-ink/45">
            {d.source === "player" ? "Indicato dal giocatore" : "Inserito da admin"} · Cambia
          </span>
        </span>
      ) : (
        <span className={`${BUTTON} h-11 w-full text-[14px]`}>Scegli mazzo</span>
      )}
    </button>
  );
}
