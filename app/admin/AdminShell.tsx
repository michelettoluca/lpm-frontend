"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useId, useState } from "react";
import type { AdminAccount, AdminError, ManagedEvent, Season } from "@/app/lib/adminTypes";
import { callAdmin, isAuthLoss, type CallResult } from "./client";
import { ErrorPanel } from "./ErrorPanel";
import { BUTTON, BUTTON_GHOST, BUTTON_PRIMARY } from "./dashboardUi";
import { CONTROL } from "./fields";

type DashboardContext = {
  /** The signed-in admin. */
  me: AdminAccount;
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
 * Admins sign in with a code sent to their email. The session token never
 * reaches this component: our own auth route keeps it in an HTTP-only cookie
 * scoped to the proxy routes. On load we ask that route who is signed in, so
 * a reload doesn't mean signing in again.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");
  const [me, setMe] = useState<AdminAccount | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [events, setEvents] = useState<ManagedEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AdminError | null>(null);

  const toGate = useCallback((reason: AdminError | null) => {
    setStatus("gate");
    setMe(null);
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
      const session = await callAdmin<AdminAccount>("/api/admin/auth");
      if (cancelled) return;
      if (!session.ok) {
        // A missing cookie is the normal first visit, not an error worth showing.
        toGate(session.error.kind === "missing_key" ? null : session.error);
        return;
      }
      setMe(session.data);
      if (await load()) setStatus("connected");
      else setStatus("gate");
    })();
    return () => {
      cancelled = true;
    };
  }, [load, toGate]);

  function signedIn(admin: AdminAccount) {
    setMe(admin);
    setError(null);
    void load().then((ok) => setStatus(ok ? "connected" : "gate"));
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

  const connected = status === "connected" && me !== null;

  return (
    <Context.Provider value={me ? { me, seasons, events, setSeasons, setEvents, call, refresh: load } : null}>
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
                  {me.is_super && (
                    <Link href="/admin/admins" className={BUTTON_GHOST}>
                      Amministratori
                    </Link>
                  )}
                  <button type="button" onClick={() => void refreshLists()} disabled={busy} className={BUTTON_GHOST}>
                    {busy ? "Attendi…" : "Ricarica"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void disconnect()}
                    disabled={busy}
                    className={BUTTON}
                    title={`Connesso come ${me.email}`}
                  >
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
            <Gate status={status} error={error} onSignedIn={signedIn} />
          )}
        </main>
      </div>
    </Context.Provider>
  );
}

/**
 * Two steps: the admin's email, then the six-digit code sent to it. The API
 * gives the same answer for any address, so the code step always follows.
 */
function Gate({
  status,
  error: sessionError,
  onSignedIn,
}: {
  status: Status;
  error: AdminError | null;
  onSignedIn: (admin: AdminAccount) => void;
}) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AdminError | null>(null);
  const [resent, setResent] = useState(false);
  const ids = { email: useId(), code: useId() };
  const checking = status === "checking";
  const shown = error ?? sessionError;

  async function sendCode(again = false) {
    setBusy(true);
    setError(null);
    const res = await callAdmin<{ sent: boolean }>("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setStep("code");
    setCode("");
    setResent(again);
  }

  async function verify() {
    setBusy(true);
    setError(null);
    const res = await callAdmin<AdminAccount>("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), code }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSignedIn(res.data);
  }

  return (
    <section className="card mx-auto mt-4 max-w-md p-7 sm:mt-12">
      <p className="text-xs font-bold uppercase tracking-wider text-accent">Dashboard amministrativa</p>
      <h1 className="mt-2 text-[26px] font-extrabold leading-tight tracking-[-0.02em]">
        {step === "email" ? "Accedi alla gestione della lega" : "Controlla la tua email"}
      </h1>

      {step === "email" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy && email.trim()) void sendCode();
          }}
          className="mt-6"
        >
          <p className="mb-5 text-sm leading-relaxed text-ink/55">
            Inserisci la tua email di amministratore: ti mandiamo un codice di accesso.
          </p>
          <label htmlFor={ids.email} className="lbl block">
            Email
          </label>
          <input
            id={ids.email}
            type="email"
            className={`${CONTROL} mt-1.5`}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            autoFocus
            required
            disabled={busy || checking}
            placeholder={checking ? "Controllo la sessione…" : "nome@esempio.it"}
          />
          <button
            type="submit"
            disabled={busy || checking || !email.trim()}
            className={`${BUTTON_PRIMARY} mt-4 h-11 w-full text-[15px]`}
          >
            {busy ? "Invio…" : "Inviami il codice"}
          </button>
        </form>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy && code.length === 6) void verify();
          }}
          className="mt-6"
        >
          <p className="mb-5 text-sm leading-relaxed text-ink/55">
            Se <strong className="text-ink">{email.trim()}</strong> è un amministratore, gli abbiamo mandato un codice
            di 6 cifre. Scade tra 10 minuti.
          </p>
          <label htmlFor={ids.code} className="lbl block">
            Codice
          </label>
          <input
            id={ids.code}
            className={`${CONTROL} tn mt-1.5 text-center text-[22px] font-extrabold tracking-[0.4em]`}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            required
            disabled={busy}
            placeholder="••••••"
          />
          <button
            type="submit"
            disabled={busy || code.length !== 6}
            className={`${BUTTON_PRIMARY} mt-4 h-11 w-full text-[15px]`}
          >
            {busy ? "Verifica…" : "Accedi"}
          </button>
          <div className="mt-3 flex justify-between gap-3 text-[13px]">
            <button
              type="button"
              className="font-bold text-ink/55 hover:text-ink"
              onClick={() => {
                setStep("email");
                setError(null);
              }}
              disabled={busy}
            >
              ← Cambia email
            </button>
            <button type="button" className="font-bold text-ink/55 hover:text-ink" onClick={() => void sendCode(true)} disabled={busy}>
              {resent ? "Codice rimandato" : "Rimanda il codice"}
            </button>
          </div>
        </form>
      )}

      {shown &&
        (shown.kind === "unauthorized" && step === "code" ? (
          <p role="alert" className="mt-4 text-[13px] font-semibold text-accent">
            Codice non valido o scaduto. Controlla di averlo scritto giusto o fatti mandare un nuovo codice.
          </p>
        ) : (
          <ErrorPanel error={shown} />
        ))}
    </section>
  );
}
