"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { AdminAccount, AdminError, ManagedEvent, Season } from "@/app/lib/adminTypes";
import { callAdmin, isAuthLoss, type CallResult } from "./client";
import { ErrorPanel } from "./ErrorPanel";
import { BUTTON_PRIMARY } from "./dashboardUi";
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

const TOAST_OPTIONS = { style: { fontFamily: "var(--font-archivo), system-ui, sans-serif", borderRadius: 8 } };

const WIDTH = "mx-auto w-full max-w-[960px] px-4 sm:px-8";

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

  const connected = status === "connected" && me !== null;

  return (
    <Context.Provider value={me ? { me, seasons, events, setSeasons, setEvents, call, refresh: load } : null}>
      <div className="admin min-h-screen bg-canvas text-ink">
        <Toaster theme="dark" position="top-center" richColors closeButton toastOptions={TOAST_OPTIONS} />
        {connected ? (
          <>
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 lg:flex">
              <Sidebar me={me} busy={busy} onLogout={() => void disconnect()} />
            </aside>
            <MobileBar me={me} busy={busy} onLogout={() => void disconnect()} />
            <div className="lg:pl-56">
              <div className="min-h-screen lg:p-2">
                <main className="min-h-screen bg-page lg:min-h-[calc(100vh-16px)] lg:rounded-lg lg:border lg:border-ink/[0.07]">
                  <div className={`${WIDTH} py-6 lg:py-8`}>
                    {error && (
                      <div className="mb-6">
                        <ErrorPanel error={error} />
                      </div>
                    )}
                    {children}
                  </div>
                </main>
              </div>
            </div>
          </>
        ) : (
          <main className="px-4 py-12 sm:py-20">
            <Gate status={status} error={error} onSignedIn={signedIn} />
          </main>
        )}
      </div>
    </Context.Provider>
  );
}

type NavItem = { href: string; label: string; icon: ReactNode; match: (path: string) => boolean };

const NAV: NavItem[] = [
  {
    href: "/admin/seasons",
    label: "Stagioni",
    icon: <Icon d="M3 5.5h14M3 5.5v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-10M3 5.5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1M7 3v3M13 3v3M3 9h14" />,
    match: (path) => path.startsWith("/admin/seasons") || path.startsWith("/admin/events"),
  },
  {
    href: "/admin/declarations",
    label: "Dichiarazioni",
    icon: <Icon d="M7 4h6M7 4a1 1 0 0 0-1 1v0a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v0a1 1 0 0 0-1-1M7 4H5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2M7 10.5l2 2 4-4" />,
    match: (path) => path === "/admin/declarations",
  },
  {
    href: "/admin/archetypes",
    label: "Mazzi LPI",
    icon: <Icon d="M6 4.5h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1ZM8 2.5h8.5a1 1 0 0 1 1 1V14" />,
    match: (path) => path.startsWith("/admin/archetypes"),
  },
];

const ADMINS: NavItem = {
  href: "/admin/admins",
  label: "Amministratori",
  icon: <Icon d="M7.5 9a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5ZM2.5 16.5a5 5 0 0 1 10 0M13 4a2.75 2.75 0 0 1 0 5M15 12a5 5 0 0 1 2.5 4.5" />,
  match: (path) => path.startsWith("/admin/admins"),
};

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

/** Sections of the panel, then the public site and the account at the bottom. */
function Sidebar({ me, busy, onLogout, onNavigate }: { me: AdminAccount; busy: boolean; onLogout: () => void; onNavigate?: () => void }) {
  const path = usePathname();
  const items = me.is_super ? [...NAV, ADMINS] : NAV;
  return (
    <nav className="flex h-full w-full flex-col px-3 py-3" aria-label="Sezioni">
      <Link href="/admin/seasons" onClick={onNavigate} className="mb-4 flex h-8 items-center gap-2 px-2">
        <span className="grid h-5 w-5 place-items-center rounded bg-accent text-[11px] font-bold text-white">L</span>
        <span className="text-[13px] font-semibold">Lega Pauper Milano</span>
      </Link>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = item.match(path);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] transition-colors ${
                  active ? "bg-ink/[0.07] font-medium text-ink" : "text-ink/65 hover:bg-ink/[0.04] hover:text-ink"
                }`}
              >
                <span className={active ? "text-accent" : "text-ink/45"}>{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto">
        <AccountMenu me={me} busy={busy} onLogout={onLogout} />
      </div>
    </nav>
  );
}

/** Two letters for the avatar: "luca.micheletto.97@…" gives "LM". */
function initials(email: string) {
  const parts = email.split("@")[0].split(/[._-]+/).filter((p) => /[a-z]/i.test(p));
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "")).toUpperCase() || "?";
}

/**
 * The signed-in account at the foot of the sidebar. It opens a menu upwards
 * with the public site and signing out.
 */
function AccountMenu({ me, busy, onLogout }: { me: AdminAccount; busy: boolean; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const item = "flex h-8 w-full items-center gap-2.5 rounded px-2 text-left text-[13px] text-ink/75 hover:bg-ink/[0.05] hover:text-ink";
  return (
    <div ref={ref} className="relative">
      {open && (
        <div
          role="menu"
          className="absolute right-0 bottom-full left-0 mb-1 rounded-md border border-ink/10 bg-surface p-1 shadow-[0_8px_24px_rgba(28,27,26,0.12)]"
        >
          <p className="truncate px-2 pt-1 pb-1.5 text-[12px] text-ink/50">{me.is_super ? "Super admin" : "Admin"}</p>
          <Link href="/" target="_blank" rel="noopener" role="menuitem" className={item} onClick={() => setOpen(false)}>
            <span className="text-ink/45">
              <Icon d="M11 3.5h5.5V9M16.5 3.5 9 11M14 11.5v4a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" />
            </span>
            Sito pubblico
          </Link>
          <div className="my-1 border-t border-ink/8" />
          <button type="button" role="menuitem" className={item} disabled={busy} onClick={onLogout}>
            <span className="text-ink/45">
              <Icon d="M8 4.5H5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3M12 13.5 15.5 10 12 6.5M15.5 10H8" />
            </span>
            Esci
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-10 w-full items-center gap-2.5 rounded-md px-2 text-left transition-colors hover:bg-ink/[0.04]"
      >
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink/15 text-[10px] font-semibold text-ink">
          {initials(me.email)}
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] text-ink/75">{me.email}</span>
        <span className="text-ink/35" aria-hidden>
          <Icon d="M7 8l3-3 3 3M7 12l3 3 3-3" />
        </span>
      </button>
    </div>
  );
}

/** On a phone: the brand and a menu button that opens the sidebar as a drawer. */
function MobileBar({ me, busy, onLogout }: { me: AdminAccount; busy: boolean; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const current = [...NAV, ADMINS].find((item) => item.match(path));
  return (
    <>
      <header className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-ink/10 bg-page px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Apri il menu"
          className="-ml-1.5 grid h-8 w-8 place-items-center rounded-md text-ink/70 hover:bg-ink/[0.05]"
        >
          <Icon d="M3.5 6h13M3.5 10h13M3.5 14h13" />
        </button>
        <span className="text-[13px] font-semibold">{current?.label ?? "Admin"}</span>
      </header>
      {open && (
        <div className="panel-in fixed inset-0 z-50 bg-black/60 lg:hidden" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="sheet-in h-full w-64 border-r border-ink/10 bg-canvas">
            <Sidebar me={me} busy={busy} onLogout={onLogout} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
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
    <section className="card mx-auto max-w-sm p-6">
      <div className="mb-5 flex items-center gap-2">
        <span className="grid h-5 w-5 place-items-center rounded bg-accent text-[11px] font-bold text-white">L</span>
        <span className="text-[13px] font-semibold">Lega Pauper Milano · Admin</span>
      </div>
      <h1 className="text-[18px] font-semibold leading-tight">
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
          <p className="mb-4 text-[13px] leading-relaxed text-ink/55">
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
            className={`${BUTTON_PRIMARY} mt-4 h-9 w-full`}
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
          <p className="mb-4 text-[13px] leading-relaxed text-ink/55">
            Se <strong className="text-ink">{email.trim()}</strong> è un amministratore, gli abbiamo mandato un codice
            di 6 cifre. Scade tra 10 minuti.
          </p>
          <label htmlFor={ids.code} className="lbl block">
            Codice
          </label>
          <input
            id={ids.code}
            className={`${CONTROL} tn mt-1.5 text-center text-[18px] font-semibold tracking-[0.4em]`}
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
            className={`${BUTTON_PRIMARY} mt-4 h-9 w-full`}
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
