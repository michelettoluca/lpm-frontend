"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useId, useState } from "react";
import type { AdminError, ManagedEvent, Season } from "@/app/lib/adminTypes";
import { callAdmin, isAuthLoss, type CallResult } from "./client";
import { ErrorPanel } from "./ErrorPanel";
import { BUTTON, BUTTON_GHOST, BUTTON_PRIMARY } from "./dashboardUi";
import { CONTROL } from "./fields";

type DashboardContext = {
  seasons: Season[];
  events: ManagedEvent[];
  setSeasons: React.Dispatch<React.SetStateAction<Season[]>>;
  setEvents: React.Dispatch<React.SetStateAction<ManagedEvent[]>>;
  /** Call a proxy route; a lost session drops the whole dashboard back to the gate. */
  call: <T>(url: string, init?: RequestInit) => Promise<CallResult<T>>;
  /** Reload both lists. Resolves false when the API refused. */
  refresh: () => Promise<boolean>;
};

const Context = createContext<DashboardContext | null>(null);

export function useAdmin() {
  const context = useContext(Context);
  if (!context) throw new Error("Admin dashboard context is missing");
  return context;
}

const WIDTH = "mx-auto w-full max-w-[1080px] px-4 sm:px-6";

type Status = "checking" | "gate" | "connected";

/**
 * Dashboard frame: gate, top bar, and a shared store of seasons and
 * events so pages don't refetch on every visit.
 *
 * The key never reaches this component. The gate posts it to our own auth
 * route, which validates it against the API and keeps it in an HTTP-only
 * cookie scoped to the proxy routes. On load we ask that route whether a
 * session is still there, so a reload does not mean typing the key again.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [events, setEvents] = useState<ManagedEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AdminError | null>(null);

  const toGate = useCallback((reason: AdminError | null) => {
    setStatus("gate");
    setSeasons([]);
    setEvents([]);
    setError(reason);
  }, []);

  const call = useCallback(
    async <T,>(url: string, init?: RequestInit): Promise<CallResult<T>> => {
      const result = await callAdmin<T>(url, init);
      if (!result.ok && isAuthLoss(result.error)) toGate(result.error);
      return result;
    },
    [toGate],
  );

  const load = useCallback(async (): Promise<boolean> => {
    const [seasonResult, eventResult] = await Promise.all([
      call<Season[]>("/api/admin/seasons"),
      call<ManagedEvent[]>("/api/admin/events"),
    ]);
    const failed = [seasonResult, eventResult].find((result) => !result.ok);
    if (failed && !failed.ok) {
      setError(failed.error);
      return false;
    }
    if (seasonResult.ok) setSeasons(seasonResult.data);
    if (eventResult.ok) setEvents(eventResult.data);
    return true;
  }, [call]);

  // Resume an existing session, if the cookie is still accepted.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await callAdmin<{ ok: true }>("/api/admin/auth");
      if (cancelled) return;
      if (!session.ok) {
        // A missing cookie is the normal first visit, not an error worth showing.
        toGate(session.error.kind === "missing_key" ? null : session.error);
        return;
      }
      if (await load()) setStatus("connected");
      else setStatus("gate");
    })();
    return () => {
      cancelled = true;
    };
  }, [load, toGate]);

  async function connect(key: string) {
    setBusy(true);
    setError(null);
    const session = await callAdmin<{ ok: true }>("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    if (!session.ok) {
      setError(session.error);
    } else if (await load()) {
      setStatus("connected");
    }
    setBusy(false);
  }

  async function disconnect() {
    setBusy(true);
    await callAdmin("/api/admin/auth", { method: "DELETE" });
    setBusy(false);
    toGate(null);
  }

  async function refreshLists() {
    setBusy(true);
    setError(null);
    await load();
    setBusy(false);
  }

  const connected = status === "connected";

  return (
    <Context.Provider value={{ seasons, events, setSeasons, setEvents, call, refresh: load }}>
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 border-b border-ink/8 bg-white/70 backdrop-blur-xl">
          <div className={`${WIDTH} flex h-16 items-center justify-between gap-4`}>
            <Link href="/admin/seasons" className="text-lg font-extrabold tracking-tight">
              LPM<span className="ml-2 text-accent">Admin</span>
            </Link>
            <div className="flex items-center gap-1.5">
              <span className="hidden sm:contents">
                <Link href="/" target="_blank" rel="noopener" className={BUTTON_GHOST}>
                  Sito pubblico ↗
                </Link>
              </span>
              {connected && (
                <>
                  <button type="button" onClick={() => void refreshLists()} disabled={busy} className={BUTTON_GHOST}>
                    {busy ? "Attendi…" : "Ricarica"}
                  </button>
                  <button type="button" onClick={() => void disconnect()} disabled={busy} className={BUTTON}>
                    Esci
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <main className={`${WIDTH} py-8 lg:py-12`}>
          {connected ? (
            <>
              {error && <div className="mb-6"><ErrorPanel error={error} /></div>}
              {children}
            </>
          ) : (
            <Gate status={status} busy={busy} error={error} onSubmit={connect} />
          )}
        </main>
      </div>
    </Context.Provider>
  );
}

function Gate({
  status,
  busy,
  error,
  onSubmit,
}: {
  status: Status;
  busy: boolean;
  error: AdminError | null;
  onSubmit: (key: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [reveal, setReveal] = useState(false);
  const id = useId();
  const checking = status === "checking";

  return (
    <section className="card mx-auto mt-4 max-w-md p-7 sm:mt-12">
      <p className="text-xs font-bold uppercase tracking-wider text-accent">Dashboard amministrativa</p>
      <h1 className="mt-2 text-[26px] font-extrabold leading-tight tracking-[-0.02em]">Accedi alla gestione della lega</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink/55">
        Inserisci la chiave API per gestire stagioni, eventi e risultati dei tornei. La chiave viene
        verificata dal server e non resta mai nel browser.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!busy && draft.trim()) onSubmit(draft.trim());
        }}
        className="mt-6"
      >
        <label htmlFor={id} className="lbl block">
          Chiave API
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            id={id}
            type={reveal ? "text" : "password"}
            className={CONTROL}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            autoFocus
            disabled={busy || checking}
            placeholder={checking ? "Controllo la sessione…" : "Inserisci la chiave admin"}
          />
          <button
            type="button"
            onClick={() => setReveal((value) => !value)}
            aria-pressed={reveal}
            className={`${BUTTON} h-auto`}
          >
            {reveal ? "Nascondi" : "Mostra"}
          </button>
        </div>
        <button
          type="submit"
          disabled={busy || checking || !draft.trim()}
          className={`${BUTTON_PRIMARY} mt-4 h-11 w-full text-[15px]`}
        >
          {busy ? "Verifica…" : "Accedi"}
        </button>
      </form>
      <p className="mt-3 text-[12px] leading-relaxed text-ink/45">
        Dopo alcune chiavi sbagliate il server blocca i tentativi da questo indirizzo per un quarto d&apos;ora.
      </p>
      {error && <ErrorPanel error={error} />}
    </section>
  );
}
