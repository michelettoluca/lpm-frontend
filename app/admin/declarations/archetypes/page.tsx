"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AdminError } from "@/app/lib/adminTypes";
import { ManaCost } from "@/app/components/ArchetypePicker";
import { normalize, type Archetype } from "@/app/lib/decks";
import { useAdmin } from "../../AdminShell";
import { ErrorPanel } from "../../ErrorPanel";
import { EmptyState, notify, PageHeader } from "../../dashboardUi";

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

  const shown = useMemo(() => {
    const typed = normalize(query);
    return (list ?? []).filter((a) => normalize(a.name).includes(typed));
  }, [list, query]);

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
        back={
          <Link href="/admin/declarations" className="text-[13px] font-bold text-ink/50 hover:text-ink">
            ← Mazzi
          </Link>
        }
        title="Lista mazzi"
        meta={
          list
            ? `${list.length} mazzi da Lega Pauper Italia · ${hidden} ${hidden === 1 ? "nascosto" : "nascosti"} ai giocatori`
            : "La lista di Lega Pauper Italia"
        }
      />
      <p className="-mt-4 mb-6 max-w-[640px] text-sm leading-relaxed text-ink/55">
        La lista di Lega Pauper Italia tiene anche mazzi bannati o non più giocati. Quelli che nascondi qui spariscono
        dalla ricerca dei giocatori e dai suggerimenti; tu puoi ancora assegnarli dalla pagina Mazzi.
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
            placeholder="Cerca un mazzo"
            aria-label="Cerca un mazzo"
            className="mb-3 w-full rounded-xl border-[1.5px] border-ink/15 bg-white px-3 py-2.5 text-[15px] outline-none focus:border-accent"
          />
          <ul className="card divide-y divide-ink/8">
            {shown.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <span className={`flex min-w-0 items-center gap-2 ${a.hidden ? "text-ink/40" : ""}`}>
                  <span className={`truncate text-[14px] font-bold ${a.hidden ? "line-through" : ""}`}>{a.name}</span>
                  <span className={a.hidden ? "opacity-40" : ""}>
                    <ManaCost archetype={a} />
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!a.hidden}
                  aria-label={`${a.name} visibile ai giocatori`}
                  disabled={pending === a.id}
                  onClick={() => void toggle(a)}
                  className="flex shrink-0 items-center gap-2.5 text-[12px] font-bold text-ink/55 disabled:opacity-50"
                >
                  <span className="hidden w-16 text-right sm:inline">{a.hidden ? "Nascosto" : "Visibile"}</span>
                  <span
                    className={`relative h-6 w-11 rounded-full transition-colors ${a.hidden ? "bg-ink/15" : "bg-[#1f9d55]"}`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${
                        a.hidden ? "left-0.5" : "left-[22px]"
                      }`}
                    />
                  </span>
                </button>
              </li>
            ))}
            {shown.length === 0 && <EmptyState>Nessun mazzo trovato.</EmptyState>}
          </ul>
        </>
      )}
    </div>
  );
}
