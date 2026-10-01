"use client";

import { useEffect, useMemo, useState } from "react";
import type { AdminError } from "@/app/lib/adminTypes";
import { ManaCost, useArchetypeSearch } from "@/app/components/ArchetypePicker";
import { colorsOf, type Archetype } from "@/app/lib/decks";
import { useAdmin } from "../AdminShell";
import { ErrorPanel } from "../ErrorPanel";
import {
  Badge,
  BUTTON_PRIMARY,
  DetailList,
  Dialog,
  DIALOG_FORM,
  DialogBody,
  DialogFooter,
  EmptyState,
  notify,
  Pagination,
  rowOpens,
  Switch,
  TABLE,
  TD,
  TH,
  usePage,
} from "../dashboardUi";
import { CONTROL, Field, TEXTAREA } from "../fields";

type ListedArchetype = Required<Archetype> & { hidden: boolean };

/** What the admin writes about an archetype, as the backend takes it. */
type Details = Pick<ListedArchetype, "description" | "aliases" | "key_cards" | "hidden">;

/** The backend's limits, so the form can say so before saving. */
const MAX_DESCRIPTION = 500;

/**
 * Lega Pauper Italia's archetype list with our details on top, under
 * Impostazioni: a description, other names and key cards help players and
 * Jev find a deck, and a hidden one disappears from what players can search
 * and pick (their list keeps banned and retired decks for its history). It is
 * all kept by their id, so it holds whatever they change on their side.
 */
export function LpiList() {
  const { call } = useAdmin();
  const [list, setList] = useState<ListedArchetype[] | null>(null);
  const [error, setError] = useState<AdminError | null>(null);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<number | null>(null);
  const [selected, setSelected] = useState<ListedArchetype | null>(null);

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

  async function save(a: ListedArchetype, details: Details) {
    setPending(a.id);
    const res = await call<ListedArchetype>(`/api/admin/archetypes/${a.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(details),
    });
    setPending(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setSelected(null);
    setList((current) => current?.map((x) => (x.id === a.id ? res.data : x)) ?? null);
    notify(
      res.data.hidden === a.hidden
        ? `${a.name} salvato.`
        : res.data.hidden
          ? `${a.name} nascosto ai giocatori.`
          : `${a.name} di nuovo visibile ai giocatori.`,
    );
  }

  const hidden = list?.filter((a) => a.hidden).length ?? 0;
  const undescribed = list?.filter((a) => !a.hidden && !a.description && a.aliases.length === 0 && a.key_cards.length === 0).length ?? 0;

  return (
    <div>
      <p className="mb-4 max-w-[640px] text-[13px] leading-relaxed text-ink/55">
        {list && (
          <span className="font-medium text-ink/75">
            {list.length} mazzi da Lega Pauper Italia, {hidden} {hidden === 1 ? "nascosto" : "nascosti"} ai giocatori
            {undescribed > 0 && `, ${undescribed} visibili ancora senza dettagli`}.{" "}
          </span>
        )}
        Descrizione, altri nomi e carte chiave aiutano i giocatori e i suggerimenti a trovare il mazzo. La lista
        tiene anche mazzi bannati o non più giocati: quelli che nascondi spariscono dalla ricerca dei giocatori e dai
        suggerimenti, ma da Archetipi puoi comunque assegnarli.
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
            className={`${CONTROL} mb-3 sm:max-w-xs`}
          />
          <div className="card overflow-x-auto">
            <table className={TABLE}>
              <thead>
                <tr>
                  <th className={TH}>Mazzo</th>
                  {/* Colors and state hug the right edge, leaving the name all the room it can get. */}
                  <th className={`${TH} w-px text-right whitespace-nowrap`}>Colori</th>
                  <th className={`${TH} w-px text-right whitespace-nowrap`}>Stato</th>
                </tr>
              </thead>
              <tbody>
                {page.map((a) => {
                  const row = rowOpens(() => setSelected(a));
                  return (
                    <tr key={a.id} {...row} className={`${row.className} ${a.hidden ? "text-ink/40" : ""}`}>
                      <td className={`${TD} max-w-0`}>
                        <span className={`block truncate font-medium ${a.hidden ? "line-through" : ""}`}>{a.name}</span>
                        {a.aliases.length > 0 && (
                          <span className="block truncate text-[12px] text-ink/45">{a.aliases.join(" · ")}</span>
                        )}
                      </td>
                      <td className={`${TD} w-px whitespace-nowrap`}>
                        <span className={`flex justify-end ${a.hidden ? "opacity-40" : ""}`}>
                          <ManaCost archetype={a} small />
                        </span>
                      </td>
                      <td className={`${TD} w-px text-right whitespace-nowrap`}>
                        {a.hidden ? <Badge>Nascosto</Badge> : <Badge tone="success">Visibile</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {shown.length === 0 && <EmptyState>{searching ? "Cerco…" : "Nessun mazzo trovato."}</EmptyState>}
          <Pagination {...pager} />
          </div>
        </>
      )}
      {selected && (
        <ArchetypeForm
          key={selected.id}
          archetype={selected}
          busy={pending === selected.id}
          onClose={() => setSelected(null)}
          onSave={(details) => void save(selected, details)}
        />
      )}
    </div>
  );
}

/** One item per line, as the aliases and key cards are edited. */
function lines(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * An archetype's side panel, as a form: its description, other names, key
 * cards and visibility to players, saved together with the one button at the
 * bottom.
 */
function ArchetypeForm({
  archetype,
  busy,
  onClose,
  onSave,
}: {
  archetype: ListedArchetype;
  busy: boolean;
  onClose: () => void;
  onSave: (details: Details) => void;
}) {
  const [description, setDescription] = useState(archetype.description);
  const [aliases, setAliases] = useState(archetype.aliases.join("\n"));
  const [keyCards, setKeyCards] = useState(archetype.key_cards.join("\n"));
  const [visible, setVisible] = useState(!archetype.hidden);
  const details: Details = {
    description: description.trim(),
    aliases: lines(aliases),
    key_cards: lines(keyCards),
    hidden: !visible,
  };
  const changed =
    details.description !== archetype.description ||
    details.aliases.join("\n") !== archetype.aliases.join("\n") ||
    details.key_cards.join("\n") !== archetype.key_cards.join("\n") ||
    details.hidden !== archetype.hidden;
  const tooLong = details.description.length > MAX_DESCRIPTION;
  return (
    <Dialog title={archetype.name} description="Archetipo della lista di Lega Pauper Italia" busy={busy} onClose={onClose}>
      <form
        className={DIALOG_FORM}
        onSubmit={(event) => {
          event.preventDefault();
          if (changed && !tooLong && !busy) onSave(details);
        }}
      >
        <DialogBody>
          <DetailList
            items={[
              ["Colori", colorsOf(archetype).length > 0 ? <ManaCost key="c" archetype={archetype} small /> : "—"],
              ["ID Lega Pauper Italia", <span key="i" className="tn">{archetype.id}</span>],
            ]}
          />
          <Field
            label="Descrizione"
            htmlFor="archetype-description"
            hint="Cosa fa il mazzo, con le parole dei giocatori. La legge solo il motore dei suggerimenti."
          >
            <textarea
              id="archetype-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              disabled={busy}
              placeholder="Es. distrugge le terre dell'avversario e vince con creature grosse."
              className={TEXTAREA}
            />
            <p className={`mt-1 text-right text-[12px] tn ${tooLong ? "font-semibold text-accent" : "text-ink/45"}`}>
              {details.description.length}/{MAX_DESCRIPTION}
            </p>
          </Field>
          <Field
            label="Altri nomi"
            htmlFor="archetype-aliases"
            hint="Uno per riga: soprannomi, nomi in italiano, nomi vecchi. Chi li scrive trova il mazzo."
          >
            <textarea
              id="archetype-aliases"
              value={aliases}
              onChange={(event) => setAliases(event.target.value)}
              rows={3}
              disabled={busy}
              placeholder={"Ponza\nLand Destruction"}
              className={TEXTAREA}
            />
          </Field>
          <Field
            label="Carte chiave"
            htmlFor="archetype-key-cards"
            hint="Una per riga, col nome inglese della carta. Chi cerca una di queste trova il mazzo."
          >
            <textarea
              id="archetype-key-cards"
              value={keyCards}
              onChange={(event) => setKeyCards(event.target.value)}
              rows={3}
              disabled={busy}
              placeholder={"Stone Rain\nMwonvuli Acid-Moss"}
              className={TEXTAREA}
            />
          </Field>
          <div className="flex items-start justify-between gap-4 rounded-lg border border-ink/10 px-3 py-3">
            <div>
              <p className="text-[13px] font-medium text-ink">Visibile ai giocatori</p>
              <p className="mt-0.5 text-[12px] text-ink/50">
                Spento, il mazzo sparisce dalla ricerca dei giocatori e dai suggerimenti. Da Archetipi puoi comunque
                assegnarlo.
              </p>
            </div>
            <Switch checked={visible} disabled={busy} label="Visibile ai giocatori" onChange={() => setVisible((v) => !v)} />
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="submit" className={BUTTON_PRIMARY} disabled={!changed || tooLong || busy}>
            {busy ? "Salvo…" : "Salva modifiche"}
          </button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
