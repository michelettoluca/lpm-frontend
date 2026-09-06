"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useId, useState } from "react";
import type { AdminError, ManagedEvent, Season } from "@/app/lib/adminTypes";
import { callAdmin, isAuthLoss, type CallResult } from "./client";
import { ErrorPanel } from "./ErrorPanel";
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

const SECTIONS = [
  { href: "/admin/seasons", label: "Stagioni", index: "01" },
  { href: "/admin/events", label: "Eventi", index: "02" },
];

type Status = "checking" | "gate" | "connected";

/**
 * Dashboard frame: gate, section nav, and a shared store of seasons and
 * events so pages don't refetch on every visit.
 *
 * The key never reaches this component. The gate posts it to our own auth
 * route, which validates it against the API and keeps it in an HTTP-only
 * cookie scoped to the proxy routes. On load we ask that route whether a
 * session is still there, so a reload does not mean typing the key again.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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

  const active = seasons.find((season) => season.is_active);
  const connected = status === "connected";

  return (
    <Context.Provider value={{ seasons, events, setSeasons, setEvents, call, refresh: load }}>
      <div className="min-h-screen bg-ground">
        <header className="sticky top-0 z-30 border-b border-ink/10 bg-white">
          <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-5 py-4 lg:px-8">
            <Link href="/" className="text-lg font-extrabold tracking-tight">
              LPM<span className="ml-2 text-accent">Admin</span>
            </Link>
            {connected && (
              <div className="flex items-center gap-2">
                <span className="hidden items-center gap-2 text-xs font-bold text-ink/55 sm:flex">
                  <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
                  Sessione attiva
                </span>
                <button
                  type="button"
                  onClick={() => void refreshLists()}
                  disabled={busy}
                  className="rounded-xl border border-ink/15 px-3 py-2 text-xs font-bold hover:bg-ink/5 disabled:opacity-40"
                >
                  {busy ? "Attendi…" : "Ricarica dati"}
                </button>
                <button
                  type="button"
                  onClick={() => void disconnect()}
                  disabled={busy}
                  className="rounded-xl bg-ink px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                >
                  Esci
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="border-b border-ink/10 p-5 lg:min-h-[calc(100vh-77px)] lg:border-r lg:border-b-0 lg:p-6">
            <p className="mb-4 hidden text-[10px] font-bold uppercase tracking-[0.18em] text-ink/40 lg:block">
              Gestione lega
            </p>
            <nav aria-label="Sezioni admin" className="flex gap-2 lg:flex-col">
              {SECTIONS.map((item) => {
                const current = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={`flex flex-1 items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold ${
                      current ? "bg-accent text-white" : "text-ink/65 hover:bg-ink/5"
                    }`}
                  >
                    <span className="text-[10px] opacity-55">{item.index}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-8 hidden rounded-xl border border-ink/10 p-4 lg:block">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink/40">Stagione attiva</p>
              <p className="mt-2 text-sm font-bold">
                {connected ? active?.name ?? "Nessuna selezionata" : "Accedi per visualizzare"}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-ink/45">
                La sessione dura otto ore ed è legata a questo browser. Con «Esci» viene chiusa subito.
              </p>
            </div>
          </aside>

          <main className="min-w-0 p-5 lg:p-9">
            {connected ? (
              children
            ) : (
              <Gate status={status} busy={busy} error={error} onSubmit={connect} />
            )}
          </main>
        </div>
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
    <section className="card mx-auto mt-8 max-w-xl p-8">
      <p className="text-xs font-bold uppercase tracking-wider text-accent">Dashboard amministrativa</p>
      <h1 className="mt-3 text-3xl font-extrabold">Tutta la lega, in un posto.</h1>
      <p className="mt-4 text-sm leading-relaxed text-ink/55">
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
            className="shrink-0 rounded-xl border border-ink/15 px-3 text-xs font-bold hover:bg-ink/5"
          >
            {reveal ? "Nascondi" : "Mostra"}
          </button>
        </div>
        <button
          type="submit"
          disabled={busy || checking || !draft.trim()}
          className="mt-4 w-full rounded-xl bg-accent px-4 py-3 text-[15px] font-extrabold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
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
