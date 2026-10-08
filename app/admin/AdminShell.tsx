"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Toaster } from "sonner";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { AdminAccount, AdminError, ManagedEvent, Season } from "@/app/lib/adminTypes";
import { callAdmin, isAuthLoss, type CallResult } from "./client";
import { ErrorPanel } from "./ErrorPanel";
import { BUTTON_PRIMARY, useCloseOnBack } from "./dashboardUi";
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
  /**
   * The season the panel is looking at: the active one unless the admin picked
   * another in the sidebar. Null only while there are no seasons at all.
   */
  season: Season | null;
  selectSeason: (id: number) => void;
  /** The tournament collecting decks, for the sidebar's live mark; null when none. */
  live: LiveTournament | null;
  setLive: (live: LiveTournament | null) => void;
};

export type LiveTournament = { name: string; open: boolean };

const Context = createContext<DashboardContext | null>(null);

export function useAdmin() {
  const context = useContext(Context);
  if (!context) throw new Error("Admin dashboard context is missing");
  return context;
}

const FOCUS_PAGES = ["/admin/declarations/tavoli"];

const TOAST_OPTIONS = { style: { fontFamily: "var(--font-archivo), system-ui, sans-serif", borderRadius: 8 } };

const WIDTH = "mx-auto w-full max-w-[1080px] px-4 sm:px-8";

const SEASON_KEY = "lpm:admin-season";

function storedSeason() {
  try {
    return Number(localStorage.getItem(SEASON_KEY)) || null;
  } catch {
    return null;
  }
}

/** The picked season if it still exists, else the active one, else the newest. */
function pickSeason(seasons: Season[], picked: number | null) {
  return seasons.find((s) => s.id === picked) ?? seasons.find((s) => s.is_active) ?? seasons[0] ?? null;
}

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
  const [picked, setPicked] = useState<number | null>(() => (typeof window === "undefined" ? null : storedSeason()));
  const [live, setLive] = useState<LiveTournament | null>(null);
  const path = usePathname();
  const season = pickSeason(seasons, picked);

  const selectSeason = useCallback((id: number) => {
    setPicked(id);
    try {
      localStorage.setItem(SEASON_KEY, String(id));
    } catch {
      // Private browsing: the choice lasts until the page is left.
    }
  }, []);

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

  // Whether a tournament is collecting decks, for the sidebar. Its own page
  // keeps this up to date while open; a failure here only hides the mark.
  useEffect(() => {
    if (status !== "connected") return;
    void callAdmin<{ tournament: LiveTournament | null }>("/api/admin/declarations").then((res) => {
      if (res.ok) setLive(res.data.tournament);
    });
  }, [status]);

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
  // Pages meant for one job on a phone, such as walking the tables, take the
  // whole screen without the sidebar.
  const focus = FOCUS_PAGES.includes(path);

  return (
    <Context.Provider
      value={
        me
          ? { me, seasons, events, setSeasons, setEvents, call, refresh: load, season, selectSeason, live, setLive }
          : null
      }
    >
      <div className="admin min-h-screen bg-canvas text-ink">
        <Toaster theme="dark" position="top-center" richColors closeButton toastOptions={TOAST_OPTIONS} />
        {connected && focus ? (
          <main className="min-h-screen bg-page">{children}</main>
        ) : connected ? (
          <>
            <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-ink/[0.07] lg:flex">
              <Sidebar me={me} busy={busy} onLogout={() => void disconnect()} />
            </aside>
            <MobileBar me={me} busy={busy} onLogout={() => void disconnect()} />
            <div className="lg:pl-64">
              <main className="min-h-screen">
                <div className={`${WIDTH} py-6 lg:py-10`}>
                  {error && (
                    <div className="mb-6">
                      <ErrorPanel error={error} />
                    </div>
                  )}
                  {children}
                </div>
              </main>
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

const OVERVIEW: NavItem = {
  href: "/admin",
  label: "Panoramica",
  icon: <Icon d="M3.5 4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-4ZM10.5 4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-2ZM3.5 12.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-3ZM10.5 10.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-5Z" />,
  match: (path) => path === "/admin",
};

const EVENTS: NavItem = {
  href: "/admin/events",
  label: "Tappe",
  icon: <Icon d="M3 5.5h14M3 5.5v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-10M3 5.5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1M7 3v3M13 3v3M3 9h14" />,
  match: (path) => path.startsWith("/admin/events"),
};

const LIVE: NavItem = {
  href: "/admin/declarations",
  label: "Torneo in corso",
  icon: <Icon d="M7 4h6M7 4a1 1 0 0 0-1 1v0a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v0a1 1 0 0 0-1-1M7 4H5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-2M7 10.5l2 2 4-4" />,
  match: (path) => path.startsWith("/admin/declarations"),
};

const LPI: NavItem = {
  href: "/admin/lpi",
  label: "Archetipi LPI",
  icon: <Icon d="M6 4.5h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1ZM8 2.5h8.5a1 1 0 0 1 1 1V14" />,
  match: (path) => path.startsWith("/admin/lpi"),
};

const SEASONS: NavItem = {
  href: "/admin/seasons",
  label: "Stagioni",
  icon: <Icon d="M10 3.5v2M10 14.5v2M3.5 10h2M14.5 10h2M5.4 5.4l1.4 1.4M13.2 13.2l1.4 1.4M5.4 14.6l1.4-1.4M13.2 6.8l1.4-1.4M12.5 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z" />,
  match: (path) => path.startsWith("/admin/seasons"),
};

const ADMINS: NavItem = {
  href: "/admin/admins",
  label: "Amministratori",
  icon: <Icon d="M7.5 9a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5ZM2.5 16.5a5 5 0 0 1 10 0M13 4a2.75 2.75 0 0 1 0 5M15 12a5 5 0 0 1 2.5 4.5" />,
  match: (path) => path.startsWith("/admin/admins"),
};

/** The settings, rarely visited, under the season's own pages. */
function settings(me: AdminAccount) {
  return me.is_super ? [LPI, SEASONS, ADMINS] : [LPI, SEASONS];
}

const ALL_NAV = [OVERVIEW, EVENTS, LIVE, LPI, SEASONS, ADMINS];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

function NavLink({ item, onNavigate, mark }: { item: NavItem; onNavigate?: () => void; mark?: ReactNode }) {
  const active = item.match(usePathname());
  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={`flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors ${
          active ? "bg-surface font-semibold text-ink" : "text-ink/65 hover:bg-ink/[0.04] hover:text-ink"
        }`}
      >
        <span className={active ? "text-accent" : "text-ink/45"}>{item.icon}</span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {mark}
      </Link>
    </li>
  );
}

/**
 * The season switcher, then the season's pages, the tournament collecting
 * decks, the settings, and the account at the bottom.
 */
function Sidebar({ me, busy, onLogout, onNavigate }: { me: AdminAccount; busy: boolean; onLogout: () => void; onNavigate?: () => void }) {
  const { live } = useAdmin();
  return (
    <nav className="flex h-full w-full flex-col px-3 py-4" aria-label="Sezioni">
      <Link href="/admin" onClick={onNavigate} className="mb-5 flex h-9 items-center gap-2.5 px-3">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-accent text-[13px] font-bold text-white">L</span>
        <span className="font-[family-name:var(--font-archivo)] text-[16px] font-bold">Lega Pauper Milano</span>
      </Link>
      <SeasonSwitcher onNavigate={onNavigate} />
      <ul className="mt-3 space-y-1">
        <NavLink item={OVERVIEW} onNavigate={onNavigate} />
        <NavLink item={EVENTS} onNavigate={onNavigate} />
        <NavLink
          item={LIVE}
          onNavigate={onNavigate}
          mark={
            live?.open && (
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-accent">
                <span className="live-dot h-2 w-2 rounded-full bg-accent" />
                live
              </span>
            )
          }
        />
      </ul>
      <p className="mt-7 mb-1.5 px-3 text-[13px] font-medium text-ink/40">Impostazioni</p>
      <ul className="space-y-1">
        {settings(me).map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onNavigate} />
        ))}
      </ul>
      <div className="mt-auto pt-4">
        <AccountMenu me={me} busy={busy} onLogout={onLogout} />
      </div>
    </nav>
  );
}

/** Closes a popup on a click outside it or on Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

/**
 * Which season the panel shows. Picking one keeps the page if it is one of
 * the season's own, and goes to its overview from a tappa of another season.
 */
function SeasonSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const { seasons, season, selectSeason } = useAdmin();
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);

  if (!season) {
    return (
      <Link
        href="/admin/seasons"
        onClick={onNavigate}
        className="flex h-14 items-center gap-3 rounded-xl border border-dashed border-ink/20 px-3 text-[15px] text-ink/65 hover:text-ink"
      >
        Crea la prima stagione
      </Link>
    );
  }

  function choose(id: number) {
    setOpen(false);
    selectSeason(id);
    if (path.startsWith("/admin/events/")) router.push("/admin");
    onNavigate?.();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-14 w-full items-center gap-3 rounded-xl border border-ink/10 bg-surface px-3 text-left transition-colors hover:border-ink/20"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{season.name}</span>
          <span className={`block text-[12px] ${season.is_active ? "text-[#4ade80]" : "text-ink/50"}`}>
            {season.is_active ? "Attiva sul sito" : "Non attiva sul sito"}
          </span>
        </span>
        <span className="text-ink/40" aria-hidden>
          <Icon d="M7 8l3-3 3 3M7 12l3 3 3-3" />
        </span>
      </button>
      {open && (
        <div className="menu-in absolute top-full right-0 left-0 z-40 mt-1.5 rounded-xl border border-ink/10 bg-surface p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.45)]">
          <ul role="listbox" aria-label="Stagione">
            {seasons.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={s.id === season.id}
                  onClick={() => choose(s.id)}
                  className={`flex h-11 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[15px] transition-colors hover:bg-ink/[0.05] ${
                    s.id === season.id ? "font-semibold text-ink" : "text-ink/75"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  {s.is_active && <span className="text-[12px] font-medium text-[#4ade80]">attiva</span>}
                </button>
              </li>
            ))}
          </ul>
          <div className="my-1.5 border-t border-ink/8" />
          <Link
            href="/admin/seasons"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="flex h-10 items-center rounded-lg px-2.5 text-[14px] text-ink/60 hover:bg-ink/[0.05] hover:text-ink"
          >
            Gestisci le stagioni
          </Link>
        </div>
      )}
    </div>
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
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const item = "flex h-10 w-full items-center gap-2.5 rounded-md px-2 text-left text-[15px] text-ink/75 hover:bg-ink/[0.05] hover:text-ink";
  return (
    <div ref={ref} className="relative">
      {open && (
        <div
          role="menu"
          className="menu-in-up absolute right-0 bottom-full left-0 mb-1 rounded-lg border border-ink/10 bg-surface p-1 shadow-[0_12px_32px_rgba(0,0,0,0.45)]"
        >
          <p className="truncate px-2 pt-1 pb-1.5 text-[13px] text-ink/50">{me.is_super ? "Super admin" : "Admin"}</p>
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
        className="flex h-12 w-full items-center gap-2.5 rounded-lg px-2 text-left transition-colors hover:bg-ink/[0.04]"
      >
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink/15 text-[11px] font-semibold text-ink">
          {initials(me.email)}
        </span>
        <span className="min-w-0 flex-1 truncate text-[15px] text-ink/75">{me.email}</span>
        <span className="text-ink/35" aria-hidden>
          <Icon d="M7 8l3-3 3 3M7 12l3 3 3-3" />
        </span>
      </button>
    </div>
  );
}

/** The sidebar as a drawer on a phone; back closes it like a panel. */
function Drawer({ me, busy, onLogout, onClose }: { me: AdminAccount; busy: boolean; onLogout: () => void; onClose: () => void }) {
  useCloseOnBack(onClose);
  return (
    <div className="panel-in fixed inset-0 z-50 bg-black/60 lg:hidden" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet-in-left h-full w-64 border-r border-ink/10 bg-canvas">
        <Sidebar me={me} busy={busy} onLogout={onLogout} onNavigate={onClose} />
      </div>
    </div>
  );
}

/** On a phone: the brand and a menu button that opens the sidebar as a drawer. */
function MobileBar({ me, busy, onLogout }: { me: AdminAccount; busy: boolean; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const current = ALL_NAV.find((item) => item.match(path));
  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-ink/10 bg-page px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Apri il menu"
          className="-ml-1.5 grid h-10 w-10 place-items-center rounded-lg text-ink/70 hover:bg-ink/[0.05]"
        >
          <Icon d="M4.5 4h11A1.5 1.5 0 0 1 17 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 14.5v-9A1.5 1.5 0 0 1 4.5 4ZM8 4v12" />
        </button>
        <span className="text-[15px] font-semibold">{current?.label ?? "Admin"}</span>
      </header>
      {open && <Drawer me={me} busy={busy} onLogout={onLogout} onClose={() => setOpen(false)} />}
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
        <span className="grid h-5 w-5 place-items-center rounded-md bg-accent text-[12px] font-bold text-white">L</span>
        <span className="text-[15px] font-semibold">Lega Pauper Milano · Admin</span>
      </div>
      <h1 className="text-[20px] font-semibold leading-tight">
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
          <p className="mb-4 text-[15px] leading-relaxed text-ink/55">
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
            className={`${BUTTON_PRIMARY} mt-4 h-11 w-full`}
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
          <p className="mb-4 text-[15px] leading-relaxed text-ink/55">
            Se <strong className="text-ink">{email.trim()}</strong> è un amministratore, gli abbiamo mandato un codice
            di 6 cifre. Scade tra 10 minuti.
          </p>
          <label htmlFor={ids.code} className="lbl block">
            Codice
          </label>
          <input
            id={ids.code}
            className={`${CONTROL} tn mt-1.5 text-center text-[20px] font-semibold tracking-[0.4em]`}
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
            className={`${BUTTON_PRIMARY} mt-4 h-11 w-full`}
          >
            {busy ? "Verifica…" : "Accedi"}
          </button>
          <div className="mt-3 flex justify-between gap-3 text-[15px]">
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
          <p role="alert" className="mt-4 text-[15px] font-semibold text-accent">
            Codice non valido o scaduto. Controlla di averlo scritto giusto o fatti mandare un nuovo codice.
          </p>
        ) : (
          <ErrorPanel error={shown} />
        ))}
    </section>
  );
}
