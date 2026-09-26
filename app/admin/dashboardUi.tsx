"use client";

import { useEffect, useId, type ReactNode } from "react";

const BUTTON_BASE =
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 text-[13px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40";
/** Neutral action. */
export const BUTTON = `${BUTTON_BASE} border border-ink/12 bg-white shadow-[0_1px_2px_rgba(28,27,26,0.06)] hover:bg-ink/[0.03]`;
/** The one thing the view is for. At most one per row or dialog. */
export const BUTTON_PRIMARY = `${BUTTON_BASE} bg-accent-grad shadow-glow text-white hover:brightness-105`;
/** Low-emphasis action that sits next to others. */
export const BUTTON_GHOST = `${BUTTON_BASE} text-ink/60 hover:bg-ink/5 hover:text-ink`;
/** Destructive action that opens a confirmation. */
export const BUTTON_DANGER = `${BUTTON_BASE} text-accent hover:bg-tint`;

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
    <header className="mb-8">
      {back && <div className="mb-3">{back}</div>}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.02em] lg:text-[34px]">{title}</h1>
            {badge}
          </div>
          {meta && <div className="mt-1.5 text-sm text-ink/55">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function SectionHeader({ title, aside, action }: { title: string; aside?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex min-h-9 items-center justify-between gap-4">
      <div className="flex items-baseline gap-3">
        <h2 className="text-[13px] font-extrabold uppercase tracking-[0.08em]">{title}</h2>
        {aside && <span className="tn text-[13px] text-ink/45">{aside}</span>}
      </div>
      {action}
    </div>
  );
}

export function Badge({ tone = "muted", children }: { tone?: "accent" | "ink" | "muted" | "outline"; children: ReactNode }) {
  const skin = {
    accent: "bg-accent-grad text-white shadow-[0_4px_12px_-4px_rgba(255,45,26,0.6)]",
    ink: "bg-ink text-white",
    muted: "bg-ink/5 text-ink/55",
    outline: "border border-accent text-accent",
  }[tone];
  return (
    <span
      className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[10px] font-bold uppercase tracking-wider ${skin}`}
    >
      {children}
    </span>
  );
}

/** Confirmation line after a successful action. */
export function Notice({ children, onDismiss }: { children: ReactNode; onDismiss: () => void }) {
  return (
    <div
      role="status"
      className="panel-in mb-6 flex items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-white py-2 pr-2 pl-4 text-sm font-semibold"
    >
      <div className="min-w-0">{children}</div>
      <button type="button" onClick={onDismiss} className={BUTTON_GHOST} aria-label="Chiudi messaggio">
        ✕
      </button>
    </div>
  );
}

/** Blocking condition the page can't work around, with the way out. */
export function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section role="alert" className="mb-6 rounded-2xl border border-accent bg-tint p-5">
      <h2 className="font-bold">{title}</h2>
      <div className="mt-1.5 text-sm text-ink/65">{children}</div>
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-5 py-12 text-center text-sm text-ink/50">{children}</p>;
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
      className="panel-in fixed inset-0 z-50 flex justify-end bg-ink/45"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="sheet-in flex h-full w-full max-w-[520px] flex-col bg-white shadow-[-18px_0_44px_rgba(28,27,26,0.18)]"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-ink/10 px-6 pt-5 pb-4">
          <div className="min-w-0">
            <h2 id={headingId} className="text-lg font-extrabold tracking-[-0.01em]">
              {title}
            </h2>
            {description && <div className="mt-1 text-sm text-ink/55">{description}</div>}
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
  return <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-ink/75">{children}</div>;
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return <div className="flex shrink-0 justify-end gap-2 border-t border-ink/10 px-6 py-4">{children}</div>;
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
