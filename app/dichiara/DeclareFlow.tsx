"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArchetypePicker, deckLabel, ManaCost } from "../components/ArchetypePicker";
import type { Archetype } from "../lib/decks";

type Current = {
  tournament: { id: number; name: string };
  round: { number: number; published: boolean; tables: number; byes: boolean };
};

type Seat = { team_id: number; name: string; declared: boolean };

/** A declaration this phone made, as the API shows it to the receipt holder. */
type Mine = {
  receipt: string;
  team_id: number;
  player_name: string;
  archetype_id: number;
  archetype_name: string;
};

type Step =
  | { kind: "table" }
  | { kind: "player"; table: number; seats: Seat[] }
  | { kind: "deck"; table: number; seat: Seat }
  | { kind: "confirm"; table: number; seat: Seat; archetype: Archetype }
  | { kind: "done"; mine: Mine }
  /** Asks before withdrawing a declaration, as the submission does. */
  | { kind: "withdraw"; mine: Mine };

const RECEIPTS_KEY = "lpm:deck-receipts";

function readReceipts(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECEIPTS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((r): r is string => typeof r === "string") : [];
  } catch {
    return [];
  }
}

function writeReceipts(receipts: string[]) {
  try {
    localStorage.setItem(RECEIPTS_KEY, JSON.stringify(receipts.slice(-20)));
  } catch {
    // Private browsing: the declaration still counts, only the receipt is lost.
  }
}

async function call<T>(url: string, init?: RequestInit): Promise<{ status: number; data: T | null }> {
  try {
    const res = await fetch(url, init);
    const data = (await res.json().catch(() => null)) as T | null;
    return { status: res.status, data: res.ok ? data : null };
  } catch {
    return { status: 0, data: null };
  }
}

function postJSON(body: unknown): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

const PRIMARY =
  "bg-accent-grad shadow-glow inline-flex h-12 w-full items-center justify-center rounded-2xl px-5 text-[16px] font-bold text-white transition hover:brightness-105 disabled:opacity-40";
const SECONDARY =
  "inline-flex h-12 w-full items-center justify-center rounded-2xl border border-ink/12 bg-white px-5 text-[15px] font-bold shadow-[0_1px_2px_rgba(28,27,26,0.06)] transition hover:bg-ink/[0.03] disabled:opacity-40";
/** Destructive but not the action the screen is for: outlined, not filled. */
const DANGER =
  "inline-flex h-12 w-full items-center justify-center rounded-2xl border-[1.5px] border-accent bg-white px-5 text-[15px] font-bold text-accent transition hover:bg-tint disabled:opacity-40";
const LINK = "text-[14px] font-bold text-ink/55 hover:text-ink disabled:opacity-40";

/**
 * Table number → which of the two players you are → your deck → confirm.
 * The phone keeps a receipt for each declaration, so it can show it again
 * and withdraw it; other phones only ever learn that a player has declared.
 */
export function DeclareFlow() {
  const [current, setCurrent] = useState<Current | null>(null);
  const [status, setStatus] = useState<"loading" | "closed" | "error" | "ready">("loading");
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [mine, setMine] = useState<Mine[]>([]);
  // The table step depends on whether this phone has declared already, so it
  // waits for the receipts to be checked.
  const [mineLoaded, setMineLoaded] = useState(false);
  const [step, setStep] = useState<Step>({ kind: "table" });
  const [tableInput, setTableInput] = useState("");
  const [busy, setBusy] = useState(false);

  const archetypeOf = (m: Mine) => archetypes.find((a) => a.id === m.archetype_id);

  const loadCurrent = useCallback(async () => {
    const res = await call<Current>("/api/dichiara");
    if (res.status === 404) setStatus("closed");
    else if (!res.data) setStatus("error");
    else {
      setCurrent(res.data);
      setStatus("ready");
    }
    return res.data;
  }, []);

  const loadMine = useCallback(async () => {
    const receipts = readReceipts();
    if (receipts.length > 0) {
      const res = await call<Mine[]>("/api/dichiara/mine", postJSON({ receipts }));
      if (res.data) setMine(res.data);
    }
    setMineLoaded(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load
    void loadCurrent();
    void loadMine();
    void call<Archetype[]>("/api/dichiara/archetypes").then((res) => res.data && setArchetypes(res.data));
  }, [loadCurrent, loadMine]);

  async function openTable(table: number) {
    setBusy(true);
    const res = await call<{ seats: Seat[] }>(`/api/dichiara/tables/${table}`);
    setBusy(false);
    if (res.data) {
      setStep({ kind: "player", table, seats: res.data.seats });
      return;
    }
    if (res.status === 404) {
      await loadCurrent();
      toast.error(
        table === 0
          ? "In questo turno non ci sono bye."
          : `Il tavolo ${table} non c'è nel turno in corso. Controlla il numero sugli abbinamenti.`,
      );
    } else {
      toast.error("Non riusciamo a caricare il tavolo. Riprova tra qualche secondo.");
    }
  }

  async function declare(table: number, seat: Seat, archetype: Archetype) {
    setBusy(true);
    const res = await call<Mine>("/api/dichiara", postJSON({ table, team_id: seat.team_id, archetype_id: archetype.id }));
    setBusy(false);
    if (res.data) {
      writeReceipts([...readReceipts(), res.data.receipt]);
      setMine((list) => [...list.filter((m) => m.team_id !== res.data!.team_id), res.data!]);
      setStep({ kind: "done", mine: res.data });
      return;
    }
    if (res.status === 409) {
      toast.error(
        `Per ${seat.name} è già stato dichiarato un mazzo. Se non sei stato tu, avvisa un organizzatore: lo sistema lui.`,
        { duration: 12_000 },
      );
      setStep({ kind: "table" });
    } else if (res.status === 404) {
      await loadCurrent();
      toast.error("Il turno è cambiato o le dichiarazioni sono chiuse. Reinserisci il numero del tuo tavolo attuale.");
      setStep({ kind: "table" });
    } else {
      toast.error("Qualcosa è andato storto. Riprova.");
    }
  }

  async function withdraw(m: Mine) {
    setBusy(true);
    const res = await call<{ ok: boolean }>("/api/dichiara/clear", postJSON({ receipt: m.receipt }));
    setBusy(false);
    if (!res.data && res.status !== 404) {
      toast.error("Non siamo riusciti a cancellare la dichiarazione. Riprova.");
      return false;
    }
    writeReceipts(readReceipts().filter((r) => r !== m.receipt));
    setMine((list) => list.filter((x) => x.receipt !== m.receipt));
    if (res.status === 404) {
      toast.error("Le dichiarazioni sono chiuse: per cambiare mazzo chiedi a un organizzatore.");
      return false;
    }
    return true;
  }

  if (status === "loading" || (status === "ready" && !mineLoaded)) {
    return <p className="py-16 text-center text-[15px] text-ink/50">Caricamento…</p>;
  }
  if (status === "closed") {
    return (
      <Panel title="Dichiarazioni chiuse">
        Al momento nessun torneo sta raccogliendo i mazzi. Si aprono il giorno della tappa: ricarica la pagina quando
        te lo dicono gli organizzatori.
      </Panel>
    );
  }
  if (status === "error" || !current) {
    return (
      <Panel title="Non riusciamo a collegarci">
        <button type="button" className={`${SECONDARY} mt-4`} onClick={() => void loadCurrent()}>
          Riprova
        </button>
      </Panel>
    );
  }

  const { round } = current;

  return (
    <div>
      <p className="lbl">{current.tournament.name}</p>

      {step.kind === "table" && (
        <>
          {mine.length > 0 ? (
            <>
              {/* A phone that has declared can only look at it or withdraw it;
                  the table search comes back once it is withdrawn. */}
              <h1 className="mt-2 text-[30px] font-extrabold leading-[1.05] tracking-[-0.02em]">Hai già dichiarato</h1>
              {mine.map((m) => (
                <div key={m.receipt}>
                  <Summary player={m.player_name} deck={m.archetype_name} archetype={archetypeOf(m)} />
                  <button
                    type="button"
                    disabled={busy}
                    className={`${SECONDARY} mt-3`}
                    onClick={() => setStep({ kind: "withdraw", mine: m })}
                  >
                    Cancella la dichiarazione
                  </button>
                </div>
              ))}
              <p className="mt-3 text-[13px] leading-relaxed text-ink/55">
                Lo vedono solo gli organizzatori. Se hai sbagliato, cancellala e dichiara di nuovo.
              </p>
            </>
          ) : (
            <h1 className="mt-2 text-[30px] font-extrabold leading-[1.05] tracking-[-0.02em]">Dichiara il tuo mazzo</h1>
          )}
          {mine.length > 0 ? null : round.published && round.tables + (round.byes ? 1 : 0) > 0 ? (
            <form
              className="mt-6"
              onSubmit={(event) => {
                event.preventDefault();
                const n = Number(tableInput);
                if (Number.isInteger(n) && n > 0) void openTable(n);
              }}
            >
              <label htmlFor="table" className="text-[15px] font-bold">
                A che tavolo sei nel turno {round.number}?
              </label>
              <input
                id="table"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                value={tableInput}
                onChange={(event) => setTableInput(event.target.value.replace(/\D/g, "").slice(0, 3))}
                placeholder="Es. 12"
                className="tn mt-2 w-full rounded-2xl border-[1.5px] border-ink/15 bg-white px-4 py-4 text-center text-[34px] font-extrabold tracking-[-0.02em] outline-none transition-colors focus:border-accent"
              />
              <button type="submit" disabled={busy || !tableInput} className={`${PRIMARY} mt-3`}>
                {busy ? "Cerco il tavolo…" : "Avanti"}
              </button>
              {round.byes && (
                <button type="button" disabled={busy} onClick={() => void openTable(0)} className={`${LINK} mt-4 block w-full text-center`}>
                  Ho il bye in questo turno
                </button>
              )}
            </form>
          ) : (
            <Panel title="Abbinamenti non ancora pubblicati">
              {round.number === 0
                ? "Puoi dichiarare il mazzo appena escono gli abbinamenti del primo turno."
                : `Gli abbinamenti del turno ${round.number} non sono ancora pubblicati.`}
              <button type="button" className={`${SECONDARY} mt-4`} onClick={() => void loadCurrent()}>
                Aggiorna
              </button>
            </Panel>
          )}
        </>
      )}

      {step.kind === "player" && (
        <>
          <Recap onTable={() => setStep({ kind: "table" })} table={step.table} />
          <h1 className="mt-2 text-[30px] font-extrabold leading-[1.05] tracking-[-0.02em]">
            {step.table === 0 ? "Chi sei?" : `Tavolo ${step.table}: chi sei?`}
          </h1>
          <div className={`mt-6 grid gap-3 ${step.seats.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
            {step.seats.map((seat) => {
              const own = mine.find((m) => m.team_id === seat.team_id);
              return (
                <button
                  key={seat.team_id}
                  type="button"
                  disabled={seat.declared && !own}
                  onClick={() => {
                    if (own) setStep({ kind: "done", mine: own });
                    else setStep({ kind: "deck", table: step.table, seat });
                  }}
                  className="surface lift flex min-h-[132px] flex-col justify-between rounded-[22px] p-4 text-left disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
                >
                  <span className="text-[18px] font-extrabold leading-tight break-words">{seat.name}</span>
                  <span className="mt-3 text-[12px] font-bold text-ink/50">
                    {own ? `Hai dichiarato ${deckLabel(own.archetype_name)}` : seat.declared ? "Già dichiarato" : "Sono io →"}
                  </span>
                </button>
              );
            })}
          </div>
          {step.seats.some((s) => s.declared && !mine.some((m) => m.team_id === s.team_id)) && (
            <p className="mt-3 text-[13px] leading-relaxed text-ink/55">
              Hai già dichiarato da un altro telefono, o qualcuno l&apos;ha fatto al posto tuo? Avvisa un organizzatore.
            </p>
          )}
        </>
      )}

      {step.kind === "deck" && (
        <div className="flex flex-col">
          <Recap
            table={step.table}
            onTable={() => setStep({ kind: "table" })}
            player={step.seat.name}
            onPlayer={() => void openTable(step.table)}
          />
          <h1 className="mt-2 text-[26px] font-extrabold leading-[1.05] tracking-[-0.02em]">Che mazzo giochi?</h1>
          <div className="mb-4" />
          {archetypes.length === 0 ? (
            <p className="py-10 text-center text-[14px] text-ink/50">Carico la lista dei mazzi…</p>
          ) : (
            <ArchetypePicker
              archetypes={archetypes}
              autoFocus
              onPick={(archetype) => setStep({ kind: "confirm", table: step.table, seat: step.seat, archetype })}
            />
          )}
        </div>
      )}

      {step.kind === "confirm" && (
        <>
          {/* No recap here: the summary below already shows the choices, and
              "Cambia mazzo" goes back. */}
          <h1 className="mt-2 text-[30px] font-extrabold leading-[1.05] tracking-[-0.02em]">Confermi?</h1>
          <Summary player={step.seat.name} deck={step.archetype.name} archetype={step.archetype} />
          <p className="mt-3 text-[13px] leading-relaxed text-ink/55">
            Lo vedono solo gli organizzatori. Da questo telefono potrai ricontrollarlo e cancellarlo finché le
            dichiarazioni restano aperte.
          </p>
          <button
            type="button"
            disabled={busy}
            className={`${PRIMARY} mt-5`}
            onClick={() => void declare(step.table, step.seat, step.archetype)}
          >
            {busy ? "Invio…" : "Conferma"}
          </button>
          <button
            type="button"
            disabled={busy}
            className={`${SECONDARY} mt-2.5`}
            onClick={() => setStep({ kind: "deck", table: step.table, seat: step.seat })}
          >
            Cambia mazzo
          </button>
        </>
      )}

      {step.kind === "done" && (
        <>
          <div className="bg-accent-grad shadow-glow mt-6 grid h-14 w-14 place-items-center rounded-full text-[26px] font-extrabold text-white">
            ✓
          </div>
          <h1 className="mt-4 text-[30px] font-extrabold leading-[1.05] tracking-[-0.02em]">Mazzo dichiarato</h1>
          <Summary player={step.mine.player_name} deck={step.mine.archetype_name} archetype={archetypeOf(step.mine)} />
          <p className="mt-3 text-[13px] leading-relaxed text-ink/55">Buon torneo! Lo vedono solo gli organizzatori.</p>
          <button
            type="button"
            disabled={busy}
            className={`${SECONDARY} mt-5`}
            onClick={() => setStep({ kind: "withdraw", mine: step.mine })}
          >
            Ho sbagliato, cancella
          </button>
          <button type="button" className={`${LINK} mt-4 block w-full text-center`} onClick={() => setStep({ kind: "table" })}>
            Torna all&apos;inizio
          </button>
        </>
      )}

      {step.kind === "withdraw" && (
        <>
          <h1 className="mt-2 text-[30px] font-extrabold leading-[1.05] tracking-[-0.02em]">Cancellare la dichiarazione?</h1>
          <Summary player={step.mine.player_name} deck={step.mine.archetype_name} archetype={archetypeOf(step.mine)} />
          <p className="mt-3 text-[13px] leading-relaxed text-ink/55">
            Dopo potrai dichiarare di nuovo inserendo il numero del tuo tavolo.
          </p>
          <button
            type="button"
            disabled={busy}
            className={`${DANGER} mt-5`}
            onClick={async () => {
              if (!(await withdraw(step.mine))) {
                setStep({ kind: "table" });
                return;
              }
              setStep({ kind: "table" });
              toast.success("Dichiarazione cancellata. Ora puoi dichiarare di nuovo.");
            }}
          >
            {busy ? "Attendi…" : "Sì, cancella"}
          </button>
          <button
            type="button"
            disabled={busy}
            className={`${SECONDARY} mt-2.5`}
            onClick={() => setStep({ kind: "table" })}
          >
            No, tienila
          </button>
        </>
      )}
    </div>
  );
}

/**
 * The choices made so far, above each step. Each one is a shortcut back to
 * the step that made it, without walking back through the ones in between.
 */
function Recap({
  table,
  onTable,
  player,
  onPlayer,
}: {
  table: number;
  onTable: () => void;
  player?: string;
  onPlayer?: () => void;
}) {
  const chips: { label: string; title: string; onClick: () => void }[] = [
    { label: table === 0 ? "Bye" : `Tavolo ${table}`, title: "Cambia tavolo", onClick: onTable },
  ];
  if (player && onPlayer) chips.push({ label: player, title: "Cambia giocatore", onClick: onPlayer });
  return (
    <nav aria-label="Le tue scelte" className="mt-3 flex flex-wrap items-center gap-1.5">
      {chips.map((chip, i) => (
        <span key={chip.title} className="contents">
          {i > 0 && (
            <span aria-hidden className="text-[13px] text-ink/30">
              ›
            </span>
          )}
          <button
            type="button"
            onClick={chip.onClick}
            title={chip.title}
            aria-label={`${chip.label}, ${chip.title.toLowerCase()}`}
            className="inline-flex h-8 max-w-full items-center gap-1 rounded-full border border-ink/12 bg-white px-3 text-[13px] font-bold shadow-[0_1px_2px_rgba(28,27,26,0.06)] transition hover:border-accent hover:text-accent"
          >
            <span className="truncate">{chip.label}</span>
            <span aria-hidden className="text-[11px] text-ink/35">
              ✎
            </span>
          </button>
        </span>
      ))}
    </nav>
  );
}

/** Who declared what, as the confirmation, receipt and withdrawal show it. */
function Summary({ player, deck, archetype }: { player: string; deck: string; archetype?: Archetype }) {
  return (
    <div className="surface mt-6 rounded-[22px] p-5">
      <p className="lbl">Giocatore</p>
      <p className="mt-1 text-[18px] font-extrabold">{player}</p>
      <p className="lbl mt-4">Mazzo</p>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-[22px] font-extrabold tracking-[-0.01em]">
        {deckLabel(deck)} {archetype && <ManaCost archetype={archetype} />}
      </p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="surface mt-6 rounded-[22px] p-5">
      <h2 className="text-[18px] font-extrabold">{title}</h2>
      <div className="mt-1.5 text-[14px] leading-relaxed text-ink/60">{children}</div>
    </section>
  );
}
