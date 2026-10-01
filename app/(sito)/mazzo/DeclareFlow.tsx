"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deckLabel, useArchetypeSearch } from "@/app/components/ArchetypePicker";
import { colorsOf, ROGUE, UNAVAILABLE, type Archetype } from "@/app/lib/decks";
import { tappaTitle } from "@/app/lib/format";
import { Comune, Mana } from "../ui";

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
  /** An organizer set the deck: it shows, but can't be withdrawn from here. */
  locked?: boolean;
};

type Step =
  | { kind: "table" }
  | { kind: "player"; table: number; seats: Seat[] }
  | { kind: "deck"; table: number; seat: Seat }
  | { kind: "confirm"; table: number; seat: Seat; archetype: Archetype }
  | { kind: "done"; mine: Mine; table?: number }
  /** Asks before withdrawing a declaration, as the submission does. */
  | { kind: "withdraw"; mine: Mine };

/** A message above the current step, in place of a toast. */
type Note = { text: string; tone: "ok" | "error" };

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

const STEPS = ["tavolo", "chi sei", "mazzo", "conferma"];
const STEP_AT: Record<Step["kind"], number> = { table: 0, player: 1, deck: 2, confirm: 3, done: 3, withdraw: 3 };
const H1 = "rg-display rg-tight text-[36px] leading-[1] lg:text-[42px]";
const LOCKED = "Il mazzo è stato inserito da un organizzatore: per cambiarlo chiedi a loro.";

const first = (name: string) => name.split(" ")[0];
const tableLabel = (table: number) => (table === 0 ? "bye" : `tavolo ${table}`);

function Progress({ at }: { at: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label={`Passo ${at + 1} di ${STEPS.length}: ${STEPS[at]}`}>
      {STEPS.map((s, i) => (
        <li key={s} className="flex items-center gap-2" aria-hidden="true">
          <span
            className={`block h-2.5 rounded-full transition-all ${i === at ? "w-6" : "w-2.5"} ${
              i <= at ? "bg-[var(--rg-ink)]" : "bg-[var(--rg-line-strong)]"
            }`}
          />
          {i === at && <span className="text-[14px] font-semibold">{s}</span>}
        </li>
      ))}
    </ol>
  );
}

function Message({ note }: { note: Note | null }) {
  if (!note) return null;
  return (
    <p
      role={note.tone === "error" ? "alert" : "status"}
      className={`mt-4 rounded-[16px] px-4 py-3 text-[15px] leading-relaxed ${
        note.tone === "error" ? "bg-[var(--rg-soft-2)] font-semibold text-[var(--rg-link)]" : "bg-[var(--rg-soft)]"
      }`}
    >
      {note.text}
    </p>
  );
}

/** Who plays what, as the confirmation, receipt and withdrawal show it. */
function Receipt({ label, mine, archetype, detail }: { label: string; mine: Mine; archetype?: Archetype; detail: string }) {
  return (
    <div className="rounded-[20px] bg-[var(--rg-soft)] px-5 py-5">
      <p className="rg-eyebrow">{label}</p>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="rg-display rg-strong text-[28px] leading-tight">{deckLabel(mine.archetype_name)}</span>
        {archetype && <Mana colors={colorsOf(archetype)} size={22} />}
      </p>
      <p className="rg-muted mt-1 text-[15px] tnum">{detail}</p>
    </div>
  );
}

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
  const [digits, setDigits] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

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

  // Move focus to the new question on every step after the first.
  useEffect(() => {
    if (!moved.current) return;
    heading.current?.focus();
  }, [step]);

  function go(next: Step, message: Note | null = null) {
    moved.current = true;
    setNote(message);
    setStep(next);
  }

  // Players never see Rogue or "Non Disponibile" in the list; Rogue is the
  // "not on the list" way out, without anyone having to know what it means.
  const visible = useMemo(() => archetypes.filter((a) => a.name !== ROGUE && a.name !== UNAVAILABLE), [archetypes]);
  const rogue = archetypes.find((a) => a.name === ROGUE);
  const typed = query.trim() !== "";
  const { rows, searching } = useArchetypeSearch(visible, query);

  async function openTable(table: number) {
    setBusy(true);
    const res = await call<{ seats: Seat[] }>(`/api/dichiara/tables/${table}`);
    setBusy(false);
    if (res.data) {
      go({ kind: "player", table, seats: res.data.seats });
      return;
    }
    if (res.status === 404) {
      await loadCurrent();
      setNote({
        tone: "error",
        text:
          table === 0
            ? "In questo turno non ci sono bye."
            : `Il tavolo ${table} non c'è nel turno in corso. Controlla il numero sugli abbinamenti.`,
      });
    } else {
      setNote({ tone: "error", text: "Non riusciamo a caricare il tavolo. Riprova tra qualche secondo." });
    }
  }

  function submitTable() {
    const n = Number(digits);
    if (!digits || n < 1) {
      setNote({ tone: "error", text: "Scrivi il numero che trovi sul tavolo." });
      return;
    }
    void openTable(n);
  }

  function press(key: string) {
    setNote(null);
    if (key === "del") setDigits((d) => d.slice(0, -1));
    else setDigits((d) => (d.length >= 3 ? d : (d + key).replace(/^0+/, "")));
  }

  // A physical keyboard works on the keypad too.
  useEffect(() => {
    if (step.kind !== "table" || mine.length > 0) return;
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || busy) return;
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("del");
      else if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) submitTable();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function declare(table: number, seat: Seat, archetype: Archetype) {
    setBusy(true);
    const res = await call<Mine>("/api/dichiara", postJSON({ table, team_id: seat.team_id, archetype_id: archetype.id }));
    setBusy(false);
    if (res.data) {
      const made = res.data;
      writeReceipts([...readReceipts(), made.receipt]);
      setMine((list) => [...list.filter((m) => m.team_id !== made.team_id), made]);
      setQuery("");
      go({ kind: "done", mine: made, table });
      return;
    }
    if (res.status === 409) {
      go(
        { kind: "table" },
        {
          tone: "error",
          text: `Per ${seat.name} è già stato indicato un mazzo. Se non sei stato tu, avvisa un organizzatore: lo sistema lui.`,
        },
      );
    } else if (res.status === 404) {
      await loadCurrent();
      go(
        { kind: "table" },
        { tone: "error", text: "Il turno è cambiato, o i mazzi non si possono più indicare. Reinserisci il numero del tuo tavolo attuale." },
      );
    } else {
      setNote({ tone: "error", text: "Qualcosa è andato storto. Riprova." });
    }
  }

  /** Withdraws a declaration; false, with a message, when it can't be. */
  async function withdraw(m: Mine): Promise<boolean> {
    setBusy(true);
    const res = await call<{ ok: boolean }>("/api/dichiara/clear", postJSON({ receipt: m.receipt }));
    setBusy(false);
    if (res.status === 409) {
      setMine((list) => list.map((x) => (x.receipt === m.receipt ? { ...x, locked: true } : x)));
      go({ kind: "table" }, { tone: "error", text: LOCKED });
      return false;
    }
    if (!res.data && res.status !== 404) {
      setNote({ tone: "error", text: "Non siamo riusciti a cancellare il mazzo. Riprova." });
      return false;
    }
    writeReceipts(readReceipts().filter((r) => r !== m.receipt));
    setMine((list) => list.filter((x) => x.receipt !== m.receipt));
    if (res.status === 404) {
      go({ kind: "table" }, { tone: "error", text: "I mazzi non si possono più cambiare da qui: chiedi a un organizzatore." });
      return false;
    }
    return true;
  }

  if (status === "loading" || (status === "ready" && !mineLoaded)) {
    return <p className="rg-muted py-16 text-center text-[16px]">un attimo…</p>;
  }
  if (status === "closed") {
    return (
      <section className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
        <Comune pose="sleep" className="h-[110px] w-[110px]" />
        <div>
          <h1 className={H1}>per ora è tutto chiuso.</h1>
          <p className="rg-muted mt-4 text-[16px] leading-relaxed">
            Scegli il mazzo durante la tappa, appena escono gli abbinamenti del primo turno. Quando li vedi, ricarica la
            pagina.
          </p>
        </div>
      </section>
    );
  }
  if (status === "error" || !current) {
    return (
      <section>
        <h1 className={H1}>non riusciamo a collegarci.</h1>
        <p className="rg-muted mt-4 text-[16px] leading-relaxed">Controlla la connessione e riprova.</p>
        <button type="button" className="rg-btn rg-btn-line mt-6 w-full" onClick={() => void loadCurrent()}>
          riprova
        </button>
      </section>
    );
  }

  const { round } = current;
  const tappa = tappaTitle(current.tournament.name).toLowerCase();
  const open = round.published && round.tables + (round.byes ? 1 : 0) > 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="rg-eyebrow">
          {tappa}
          {round.number > 0 && ` · turno ${round.number}`}
        </p>
        {mine.length === 0 && step.kind !== "done" && step.kind !== "withdraw" && open && <Progress at={STEP_AT[step.kind]} />}
      </div>

      {/* ---------------- 1. table, or what this phone declared ---------------- */}
      {step.kind === "table" &&
        (mine.length > 0 ? (
          // A phone that has declared can only look at it or withdraw it; the
          // keypad comes back once it is withdrawn.
          <section className="mt-6">
            <h1 ref={heading} tabIndex={-1} className={H1}>
              hai già indicato il mazzo.
            </h1>
            <Message note={note} />
            <div className="mt-6 grid gap-4">
              {mine.map((m) => (
                <div key={m.receipt}>
                  <Receipt label="giochi" mine={m} archetype={archetypeOf(m)} detail={m.player_name} />
                  {m.locked ? (
                    <p className="rg-muted mt-3 text-[15px] leading-relaxed">{LOCKED}</p>
                  ) : (
                    <>
                      <p className="rg-muted mt-3 text-[15px] leading-relaxed">
                        Lo vedono solo gli organizzatori. Se hai sbagliato, puoi cambiarlo.
                      </p>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => go({ kind: "withdraw", mine: m })}
                        className="rg-btn rg-btn-line mt-4 w-full"
                      >
                        cambia mazzo
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        ) : open ? (
          <section className="mt-6">
            <h1 ref={heading} tabIndex={-1} className={H1}>
              a che tavolo sei?
            </h1>
            <Message note={note} />
            <div className="mt-2 flex items-end justify-center lg:mt-1">
              <output
                aria-live="polite"
                aria-label="Numero del tavolo"
                className={`rg-display rg-tight tnum block min-h-[124px] text-center text-[120px] leading-none lg:min-h-[96px] lg:text-[92px] ${
                  digits ? "" : "rg-outline"
                }`}
              >
                {digits || "0"}
              </output>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => (
                <button key={k} type="button" disabled={busy} onClick={() => press(k)} className="rg-key rg-display tnum">
                  {k}
                </button>
              ))}
              <button
                type="button"
                disabled={busy}
                onClick={() => press("del")}
                className="rg-key rg-key-soft"
                aria-label="Cancella una cifra"
              >
                <svg viewBox="0 0 40 24" className="h-6 w-10" aria-hidden="true">
                  <path
                    d="M12 3 H36 V21 H12 L3 12 Z M19 8 L28 16 M28 8 L19 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <button type="button" disabled={busy} onClick={() => press("0")} className="rg-key rg-display tnum">
                0
              </button>
              <button type="button" disabled={busy} onClick={submitTable} className="rg-key rg-key-go rg-display">
                {busy ? "…" : "via"}
              </button>
            </div>
            {round.byes && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void openTable(0)}
                className="rg-textlink mt-6 inline-flex min-h-11 items-center"
              >
                ho il bye in questo turno
              </button>
            )}
          </section>
        ) : (
          <section className="mt-6">
            <h1 ref={heading} tabIndex={-1} className={H1}>
              abbinamenti non ancora pubblicati.
            </h1>
            <p className="rg-muted mt-4 text-[16px] leading-relaxed">
              {round.number === 0
                ? "Scegli il mazzo appena escono gli abbinamenti del primo turno."
                : `Gli abbinamenti del turno ${round.number} non sono ancora pubblicati.`}
            </p>
            <button type="button" className="rg-btn rg-btn-line mt-6 w-full" onClick={() => void loadCurrent()}>
              aggiorna
            </button>
          </section>
        ))}

      {/* ---------------- 2. player ---------------- */}
      {step.kind === "player" && (
        <section className="mt-6">
          <h1 ref={heading} tabIndex={-1} className={H1}>
            {step.table === 0 ? "bye. tu chi sei?" : `tavolo ${step.table}. tu chi sei?`}
          </h1>
          <Message note={note} />
          <div className="mt-6 grid gap-3">
            {step.seats.map((seat) => {
              const own = mine.find((m) => m.team_id === seat.team_id);
              return (
                <button
                  key={seat.team_id}
                  type="button"
                  disabled={seat.declared && !own}
                  onClick={() =>
                    own ? go({ kind: "done", mine: own, table: step.table }) : go({ kind: "deck", table: step.table, seat })
                  }
                  className="rg-seat"
                >
                  <span className="rg-display block text-[26px] leading-tight">{seat.name}</span>
                  <span className="rg-muted mt-1 block text-[15px] font-semibold">
                    {own ? `il tuo mazzo: ${deckLabel(own.archetype_name)}` : seat.declared ? "ha già indicato il mazzo" : "sono io"}
                  </span>
                </button>
              );
            })}
          </div>
          {step.seats.some((s) => s.declared && !mine.some((m) => m.team_id === s.team_id)) && (
            <p className="rg-muted mt-4 text-[15px] leading-relaxed">
              Hai già indicato il mazzo da un altro telefono, o qualcuno l&apos;ha fatto al posto tuo? Avvisa un organizzatore.
            </p>
          )}
          <button type="button" onClick={() => go({ kind: "table" })} className="rg-textlink mt-6 inline-flex min-h-11 items-center">
            ← ho sbagliato tavolo
          </button>
        </section>
      )}

      {/* ---------------- 3. deck ---------------- */}
      {step.kind === "deck" && (
        <section className="mt-6">
          <h1 ref={heading} tabIndex={-1} className={H1}>
            cosa giochi, {first(step.seat.name)}?
          </h1>
          <Message note={note} />
          {archetypes.length === 0 ? (
            <p className="rg-muted py-10 text-[16px]">carico la lista dei mazzi…</p>
          ) : (
            <>
              <label htmlFor="rg-deck" className="sr-only">
                Cerca il mazzo
              </label>
              <input
                id="rg-deck"
                type="search"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={200}
                placeholder="nome, colori (es. UB) o una carta"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="rg-input mt-5"
              />
              {!typed ? (
                <p className="rg-muted mt-4 text-[15px] leading-relaxed">
                  Scrivi il nome del mazzo, i suoi colori (es. <strong className="rg-strong">UB</strong>,{" "}
                  <strong className="rg-strong">mono rosso</strong>) o una carta che giochi.
                </p>
              ) : (
                <ul className="mt-4" aria-busy={searching}>
                  {rows.map((a) => (
                    <li key={a.id} className="rg-hr">
                      <button
                        type="button"
                        onClick={() => go({ kind: "confirm", table: step.table, seat: step.seat, archetype: a })}
                        className="rg-row -mx-2 flex min-h-15 w-[calc(100%+1rem)] items-center justify-between gap-4 px-2 text-left"
                      >
                        <span className="rg-display text-[21px] leading-tight">{a.name}</span>
                        <Mana colors={colorsOf(a)} size={24} />
                      </button>
                    </li>
                  ))}
                  {searching && <li className="rg-muted py-6 text-[15px]">cerco…</li>}
                  {rows.length === 0 && !searching && (
                    <li className="py-6">
                      <p className="rg-display text-[22px] leading-tight">Nessun mazzo trovato.</p>
                      <p className="rg-muted mt-2 text-[15px]">Prova con un&apos;altra parola o una carta del mazzo.</p>
                    </li>
                  )}
                </ul>
              )}
              {typed && rogue && (
                <div
                  className={`mt-4 rounded-[20px] px-5 py-4 ${
                    rows.length === 0 && !searching ? "bg-[var(--rg-soft-2)]" : "bg-[var(--rg-soft)]"
                  }`}
                >
                  <p className="text-[16px] font-semibold">Il tuo mazzo non è in questa lista?</p>
                  <p className="rg-muted mt-0.5 text-[15px]">Nessun problema: lo segniamo come mazzo fuori lista.</p>
                  <button
                    type="button"
                    onClick={() => go({ kind: "confirm", table: step.table, seat: step.seat, archetype: rogue })}
                    className="rg-btn rg-btn-line mt-3 w-full"
                  >
                    non è nella lista
                  </button>
                </div>
              )}
            </>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => void openTable(step.table)}
            className="rg-textlink mt-6 inline-flex min-h-11 items-center"
          >
            ← non sono {first(step.seat.name)}
          </button>
        </section>
      )}

      {/* ---------------- 4. confirm ---------------- */}
      {step.kind === "confirm" && (
        <section className="mt-6">
          <h1 ref={heading} tabIndex={-1} className={H1}>
            ricapitolando.
          </h1>
          <Message note={note} />
          <dl className="mt-6 rounded-[20px] bg-[var(--rg-soft)] px-5 py-1">
            {[
              { k: "giocatore", v: step.seat.name },
              { k: "tavolo", v: step.table === 0 ? "bye" : String(step.table) },
              ...(round.number > 0 ? [{ k: "turno", v: String(round.number) }] : []),
            ].map((x, i) => (
              <div key={x.k} className={`grid grid-cols-[6.5rem_1fr] items-baseline py-3 ${i ? "rg-hr" : ""}`}>
                <dt className="rg-muted text-[14px] font-semibold">{x.k}</dt>
                <dd className="rg-display tnum text-[20px]">{x.v}</dd>
              </div>
            ))}
            <div className="rg-hr grid grid-cols-[6.5rem_1fr] items-center py-3">
              <dt className="rg-muted text-[14px] font-semibold">mazzo</dt>
              <dd className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="rg-display rg-strong text-[26px] leading-tight">{deckLabel(step.archetype.name)}</span>
                <Mana colors={colorsOf(step.archetype)} size={22} />
              </dd>
            </div>
          </dl>
          <div className="mt-8 grid gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void declare(step.table, step.seat, step.archetype)}
              className="rg-btn rg-btn-fill w-full"
            >
              {busy ? "invio…" : "sì, confermo"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => go({ kind: "deck", table: step.table, seat: step.seat })}
              className="rg-btn rg-btn-line w-full"
            >
              no, cambio mazzo
            </button>
          </div>
        </section>
      )}

      {/* ---------------- done ---------------- */}
      {step.kind === "done" && (
        <section className="rg-pop mt-6 text-center">
          <Comune pose="party" className="mx-auto h-[130px] w-[130px]" />
          <h1 ref={heading} tabIndex={-1} className="rg-display rg-tight mt-2 text-[48px] leading-[0.95]">
            fatto!
          </h1>
          <p className="rg-display mt-2 text-[22px] leading-tight">buona partita, {first(step.mine.player_name)}.</p>
          <div className="mx-auto mt-7 max-w-[380px] text-left">
            <Receipt
              label="giochi"
              mine={step.mine}
              archetype={archetypeOf(step.mine)}
              detail={[
                step.mine.player_name,
                step.table !== undefined ? tableLabel(step.table) : null,
                round.number > 0 ? `turno ${round.number}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
          </div>
          {step.mine.locked ? (
            <p className="rg-muted mt-5 text-[15px] leading-relaxed">{LOCKED}</p>
          ) : (
            <>
              <p className="rg-muted mt-5 text-[15px] leading-relaxed">
                Lo vedono solo gli organizzatori. Se hai sbagliato, puoi cambiarlo.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => go({ kind: "withdraw", mine: step.mine })}
                className="rg-btn rg-btn-line mt-6 w-full max-w-[380px]"
              >
                cambia mazzo
              </button>
            </>
          )}
        </section>
      )}

      {/* ---------------- withdraw ---------------- */}
      {step.kind === "withdraw" && (
        <section className="mt-6">
          <h1 ref={heading} tabIndex={-1} className={H1}>
            sei sicuro?
          </h1>
          <Message note={note} />
          <p className="mt-5 text-[17px] leading-relaxed">
            Cancelli <strong>{deckLabel(step.mine.archetype_name)}</strong> per {step.mine.player_name}. Poi puoi indicarne un
            altro inserendo il numero del tuo tavolo.
          </p>
          <div className="mt-8 grid gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                if (!(await withdraw(step.mine))) return;
                setDigits("");
                go({ kind: "table" }, { tone: "ok", text: "Mazzo cancellato. Ora puoi indicarne un altro." });
              }}
              className="rg-btn rg-btn-fill w-full"
            >
              {busy ? "attendi…" : "sì, cancella"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => go({ kind: "table" })}
              className="rg-btn rg-btn-line w-full"
            >
              no, tienilo
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
