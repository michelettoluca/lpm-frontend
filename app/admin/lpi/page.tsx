"use client";

import { useEffect, useMemo, useState } from "react";
import type { AdminError } from "@/app/lib/adminTypes";
import { ManaCost, useArchetypeSearch } from "@/app/components/ArchetypePicker";
import type { Archetype } from "@/app/lib/decks";
import { useAdmin } from "../AdminShell";
import { ErrorPanel } from "../ErrorPanel";
import { EmptyState, notify, PageHeader, Pagination, TABLE, TD, TH, usePage } from "../dashboardUi";
import { CONTROL } from "../fields";

type ListedArchetype = Archetype & { hidden: boolean };

/**
 * Lega Pauper Italia's archetype list with a blacklist on top: their list
 * keeps banned and retired decks for its history, and a hidden one disappears
 * from what players can search and declare. Hiding is by their id, so it
 * holds whatever they change on their side.
 */
export default function ArchetypeListPage() {
  const { call } = useAdmin();
  const [list, setList] = useState<ListedArchetype[] | null>(null);
  const [error, setError] = useState<AdminError | null>(null);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void call<ListedArchetype[]>("/api/admin/archetypes").then((res) => {
      if (cancelled) return;
      if (res.ok) setList(res.data);
      else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [call]);

  // The same search players use, Jev included; empty, it lists everything.
  const all = useMemo(() => list ?? [], [list]);
  const { rows, searching } = useArchetypeSearch(all, query, all.length);
  const shown = query.trim() ? rows : all;
  const { rows: page, pager } = usePage(shown);

  async function toggle(a: ListedArchetype) {
    setPending(a.id);
    const res = await call<ListedArchetype>(`/api/admin/archetypes/${a.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden: !a.hidden }),
    });
    setPending(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setList((current) => current?.map((x) => (x.id === a.id ? { ...x, hidden: res.data.hidden } : x)) ?? null);
    notify(res.data.hidden ? `${a.name} nascosto ai giocatori.` : `${a.name} di nuovo visibile ai giocatori.`);
  }

  const hidden = list?.filter((a) => a.hidden).length ?? 0;

  return (
    <div>
      <PageHeader
        title="Lista LPI"
        meta={
          list
            ? `${list.length} mazzi da Lega Pauper Italia · ${hidden} ${hidden === 1 ? "nascosto" : "nascosti"} ai giocatori`
            : "La lista di Lega Pauper Italia"
        }
      />
      <p className="-mt-3 mb-5 max-w-[620px] text-[13px] leading-relaxed text-ink/55">
        La lista di Lega Pauper Italia tiene anche mazzi bannati o non più giocati. Quelli che nascondi qui spariscono
        dalla ricerca dei giocatori e dai suggerimenti; da Archetipi puoi comunque assegnarli.
      </p>

      {error && (
        <div className="mb-6">
          <ErrorPanel error={error} />
        </div>
      )}

      {!list ? (
        !error && <p className="py-16 text-center text-sm text-ink/50">Caricamento…</p>
      ) : (
        <>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nome, colori (es. UB) o una carta…"
            aria-label="Cerca un mazzo"
            className={`${CONTROL} mb-3 max-w-xs`}
          />
          <div className="card overflow-x-auto">
            <table className={TABLE}>
              <thead>
                <tr>
                  <th className={TH}>Mazzo</th>
                  <th className={`${TH} w-28`}>Colori</th>
                  <th className={`${TH} w-40 text-right`}>Visibile ai giocatori</th>
                </tr>
              </thead>
              <tbody>
                {page.map((a) => (
                  <tr key={a.id} className={a.hidden ? "text-ink/40" : ""}>
                    <td className={`${TD} font-medium`}>
                      <span className={a.hidden ? "line-through" : ""}>{a.name}</span>
                    </td>
                    <td className={TD}>
                      <span className={a.hidden ? "opacity-40" : ""}>
                        <ManaCost archetype={a} small />
                      </span>
                    </td>
                    <td className={`${TD} text-right`}>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={!a.hidden}
                        aria-label={`${a.name} visibile ai giocatori`}
                        disabled={pending === a.id}
                        onClick={() => void toggle(a)}
                        className={`relative inline-block h-[18px] w-8 rounded-full align-middle transition-colors disabled:opacity-50 ${
                          a.hidden ? "bg-ink/15" : "bg-accent"
                        }`}
                      >
                        <span
                          className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-[left] ${
                            a.hidden ? "left-[2px]" : "left-[16px]"
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {shown.length === 0 && <EmptyState>{searching ? "Cerco…" : "Nessun mazzo trovato."}</EmptyState>}
          <Pagination {...pager} />
          </div>
        </>
      )}
    </div>
  );
}
