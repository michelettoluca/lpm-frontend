"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

const BUTTON_BASE =
  "inline-flex h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-[15px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40";
/** Neutral action. */
export const BUTTON = `${BUTTON_BASE} border border-ink/12 bg-surface hover:bg-ink/[0.06]`;
/** The one thing the view is for. At most one per row or dialog. */
export const BUTTON_PRIMARY = `${BUTTON_BASE} bg-accent text-white hover:bg-[#e01528]`;
/** Low-emphasis action that sits next to others. */
export const BUTTON_GHOST = `${BUTTON_BASE} text-ink/60 hover:bg-ink/[0.05] hover:text-ink`;
/** Destructive action that opens a confirmation. */
export const BUTTON_DANGER = `${BUTTON_BASE} text-accent hover:bg-accent/[0.08]`;

export function PageHeader({
  back,
  title,
  badge,
  meta,
  actions,
}: {
  back?: ReactNode;
  title: string;
  badge?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6">
      {back && <div className="mb-2 text-[15px]">{back}</div>}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.01em]">{title}</h1>
            {badge}
          </div>
          {meta && <div className="mt-1 text-[15px] text-ink/55">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function SectionHeader({ title, aside, action }: { title: string; aside?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex min-h-8 items-center justify-between gap-4">
      <div className="flex items-baseline gap-2">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {aside && <span className="tn text-[13px] text-ink/45">{aside}</span>}
      </div>
      {action}
    </div>
  );
}

/**
 * Small status label. Tones carry meaning, the same on every page: success for
 * done or live, attention for something that needs doing, muted for neutral.
 */
export function Badge({ tone = "muted", children }: { tone?: "success" | "attention" | "muted"; children: ReactNode }) {
  const skin = {
    success: "bg-[#22c55e]/12 text-[#4ade80]",
    attention: "bg-accent/12 text-[#ff5a66]",
    muted: "bg-ink/[0.07] text-ink/60",
  }[tone];
  return (
    <span className={`inline-flex h-5 items-center whitespace-nowrap rounded-md px-1.5 text-[12px] font-medium ${skin}`}>
      {children}
    </span>
  );
}

/** Data table inside a .card: header row in small grey type, thin row rules. */
export const TABLE = "w-full border-collapse text-left text-[15px]";
export const TH = "h-10 border-b border-ink/10 bg-ink/[0.015] px-3 text-[13px] font-normal text-ink/50 sm:px-4";
export const TD = "h-12 border-b border-ink/[0.07] px-3 align-middle sm:px-4";

/**
 * Props for a table row that opens its entity's side panel: clickable, and
 * reachable with Tab and Enter like a button. Actions live in the panel, not
 * in the row.
 */
export function rowOpens(onOpen: () => void) {
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: onOpen,
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onOpen();
      }
    },
    className: "cursor-pointer transition-colors hover:bg-ink/[0.03] focus-visible:bg-ink/[0.04] focus-visible:outline-none",
  };
}

/** On/off toggle, the brand red when on. */
export function Switch({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-[18px] w-10 shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? "bg-accent" : "bg-ink/15"}`}
    >
      <span
        className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-[left] ${
          checked ? "left-[16px]" : "left-[2px]"
        }`}
      />
    </button>
  );
}

/** A switch between a few named choices, the chosen one in the brand red. */
export function Segmented<T extends string>({
  value,
  options,
  disabled,
  label,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  disabled?: boolean;
  label: string;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex shrink-0 rounded-full bg-ink/10 p-[2px]">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => !on && onChange(o.value)}
            className={`h-6 rounded-full px-3 text-[13px] font-medium transition-colors disabled:opacity-50 ${
              on ? "bg-accent text-white shadow-sm" : "text-ink/60 hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Label and value pairs at the top of an entity's side panel. */
export function DetailList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="divide-y divide-ink/8 rounded-xl border border-ink/10">
      {items.map(([label, value]) => (
        <div key={label} className="flex min-h-9 items-center justify-between gap-4 px-3 py-2">
          <dt className="text-[13px] text-ink/50">{label}</dt>
          <dd className="min-w-0 text-right text-[15px] text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Rows per page the admin tables offer; the choice is kept in this browser. */
const PAGE_SIZES = [10, 15, 25, 50];
const DEFAULT_PAGE_SIZE = 15;
const PAGE_SIZE_KEY = "lpm:admin-page-size";

function storedPageSize() {
  try {
    const stored = Number(localStorage.getItem(PAGE_SIZE_KEY));
    return PAGE_SIZES.includes(stored) ? stored : DEFAULT_PAGE_SIZE;
  } catch {
    return DEFAULT_PAGE_SIZE;
  }
}

/**
 * Paging over a list already in memory: the admin lists are small enough to
 * load whole, and the pages need all of it for counts and search anyway. A
 * list that changes length, such as a new search, starts again at page one.
 */
export function usePage<T>(items: T[]) {
  const [page, setPage] = useState(0);
  const [size, setSizeState] = useState(() => (typeof window === "undefined" ? DEFAULT_PAGE_SIZE : storedPageSize()));
  const [length, setLength] = useState(items.length);
  if (length !== items.length) {
    setLength(items.length);
    setPage(0);
  }
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(page, pages - 1);
  function setSize(next: number) {
    setSizeState(next);
    setPage(0);
    try {
      localStorage.setItem(PAGE_SIZE_KEY, String(next));
    } catch {
      // Private browsing: the choice lasts until the page is left.
    }
  }
  return {
    rows: items.slice(current * size, (current + 1) * size),
    pager: { page: current, pages, total: items.length, size, setPage, setSize },
  };
}

/**
 * "16–30 di 56", rows per page, previous and next, under a table. Hidden when
 * even the smallest page holds everything.
 */
export function Pagination({ page, pages, total, size, setPage, setSize }: ReturnType<typeof usePage>["pager"]) {
  if (total <= PAGE_SIZES[0]) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-ink/8 px-4 py-2 text-[13px] text-ink/50">
      <span className="tn">
        {page * size + 1}–{Math.min(total, (page + 1) * size)} di {total}
      </span>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5">
          Righe
          <select
            value={size}
            onChange={(event) => setSize(Number(event.target.value))}
            className="h-8 rounded-lg border border-ink/12 bg-surface px-1.5 text-[13px] text-ink outline-none focus:border-accent"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-1">
          <button
            type="button"
            className={`${BUTTON} h-8 w-8 px-0`}
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            aria-label="Pagina precedente"
          >
            ‹
          </button>
          <button
            type="button"
            className={`${BUTTON} h-8 w-8 px-0`}
            disabled={page >= pages - 1}
            onClick={() => setPage(page + 1)}
            aria-label="Pagina successiva"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Confirmation after a successful action, as a toast. `long` keeps it up for
 * content worth reading through, such as a sync summary.
 */
export function notify(content: ReactNode, options: { long?: boolean } = {}) {
  toast.success(content, { duration: options.long ? 15_000 : 6_000 });
}

/** Blocking condition the page can't work around, with the way out. */
export function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section role="alert" className="mb-6 rounded-xl border border-accent/30 bg-accent/[0.04] px-4 py-3">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      <div className="mt-1 text-[15px] text-ink/65">{children}</div>
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-4 py-10 text-center text-[15px] text-ink/50">{children}</p>;
}

/**
 * Makes the browser's back, the gesture on a phone, close an overlay instead
 * of leaving the page: opening adds a history entry for it, and back pops it
 * and closes. Closing it any other way only marks the entry as spent: going
 * back on it here could cancel a navigation that is just starting, such as a
 * link in the mobile menu, so it is left in place and the next back simply
 * steps over it.
 */
export function useCloseOnBack(onClose: () => void) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  const entry = useRef<string | null>(null);
  useEffect(() => {
    // React's development double mount keeps the ref: push only once.
    if (entry.current === null) {
      entry.current = Math.random().toString(36).slice(2);
      window.history.pushState({ ...window.history.state, lpmOverlay: entry.current }, "");
    }
    const mine = entry.current;
    const onPop = () => {
      if (window.history.state?.lpmOverlay === mine) return;
      close.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (window.history.state?.lpmOverlay === mine) {
        const { lpmOverlay: _spent, ...state } = window.history.state;
        void _spent;
        window.history.replaceState(state, "");
      }
    };
  }, []);
}

/**
 * Full-height panel sliding in from the right, used for every form and
 * confirmation. Escape and a click on the backdrop close it, except while a
 * request is in flight. A form inside wraps DialogBody and DialogFooter with
 * DIALOG_FORM so the body scrolls and the footer stays pinned at the bottom.
 */
export function Dialog({
  title,
  description,
  busy = false,
  onClose,
  children,
}: {
  title: string;
  description?: ReactNode;
  busy?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const headingId = useId();
  useCloseOnBack(onClose);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    // Keep the page behind from scrolling under the panel.
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [busy, onClose]);

  return (
    <div
      className="panel-in fixed inset-0 z-50 flex justify-end bg-black/60"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="sheet-in flex h-full w-full max-w-[480px] flex-col border-l border-ink/10 bg-page shadow-[-12px_0_32px_rgba(0,0,0,0.4)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-ink/10 px-5 py-3.5">
          <div className="min-w-0">
            <h2 id={headingId} className="text-[17px] font-semibold">
              {title}
            </h2>
            {description && <div className="mt-0.5 text-[15px] text-ink/55">{description}</div>}
          </div>
          <button type="button" onClick={onClose} disabled={busy} className={`${BUTTON_GHOST} -mr-2`} aria-label="Chiudi">
            ✕
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}

/** Class for a `<form>` that wraps DialogBody and DialogFooter. */
export const DIALOG_FORM = "flex min-h-0 flex-1 flex-col";

export function DialogBody({ children }: { children: ReactNode }) {
  return <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-[15px] leading-relaxed text-ink/75">{children}</div>;
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return <div className="flex shrink-0 justify-end gap-2 border-t border-ink/10 px-5 py-3">{children}</div>;
}

/** Yes/no confirmation for actions that are quick to undo or only affect the public view. */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog title={title} busy={busy} onClose={onCancel}>
      <DialogBody>{children}</DialogBody>
      <DialogFooter>
        <button type="button" className={BUTTON} disabled={busy} onClick={onCancel}>
          Annulla
        </button>
        <button type="button" className={BUTTON_PRIMARY} disabled={busy} onClick={onConfirm} autoFocus>
          {busy ? "Attendi…" : confirmLabel}
        </button>
      </DialogFooter>
    </Dialog>
  );
}

const ROME = "Europe/Rome";

/** ISO timestamp → value for a `datetime-local` input, in the browser's zone. */
export function localDateTime(iso: string) {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

/** ISO timestamp → `YYYY-MM-DD` for a `date` input, as seen from Rome. */
export function localDate(iso: string) {
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: ROME });
}

export function displayDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", { timeZone: ROME });
}

export function displayTime(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", { timeZone: ROME, hour: "2-digit", minute: "2-digit" });
}

/** Day of month and short month name, e.g. { day: "03", month: "set" }. */
export function dayAndMonth(iso: string) {
  const date = new Date(iso);
  return {
    day: date.toLocaleDateString("it-IT", { timeZone: ROME, day: "2-digit" }),
    month: date.toLocaleDateString("it-IT", { timeZone: ROME, month: "short" }).replace(".", ""),
  };
}
