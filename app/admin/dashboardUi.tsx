import type { ReactNode } from "react";

export const ACTION =
  "rounded-xl border border-ink/15 bg-white px-3 py-2 text-xs font-bold transition-colors hover:bg-ink/5 disabled:opacity-40";
export const ACTION_ACCENT =
  "rounded-xl border border-accent bg-white px-3 py-2 text-xs font-bold text-accent transition-colors hover:bg-tint disabled:opacity-40";
export const PRIMARY =
  "rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40";
export const CELL = "px-5 py-4 text-left align-top";
export const HEAD_CELL = "lbl px-5 py-3 text-left";

export function DashboardHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink/55">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Badge({ tone = "muted", children }: { tone?: "accent" | "ink" | "muted"; children: ReactNode }) {
  const skin =
    tone === "accent"
      ? "bg-accent text-white"
      : tone === "ink"
        ? "bg-ink text-white"
        : "bg-ink/5 text-ink/60";
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${skin}`}>
      {children}
    </span>
  );
}

/** Confirmation line after a successful action. */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="panel-in mb-5 rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm font-semibold">
      {children}
    </p>
  );
}

/** Inline confirmation for an action that is quick to undo or only affects the public view. */
export function ConfirmAction({
  title,
  description,
  confirmLabel,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <section role="alert" className="panel-in mb-5 rounded-2xl border border-accent bg-tint p-5">
      <h2 className="font-bold">{title}</h2>
      <p className="mt-2 text-sm text-ink/65">{description}</p>
      <div className="mt-4 flex gap-2">
        <button type="button" className={ACTION} disabled={busy} onClick={onCancel}>
          Annulla
        </button>
        <button type="button" className={PRIMARY} disabled={busy} onClick={onConfirm}>
          {busy ? "Attendi…" : confirmLabel}
        </button>
      </div>
    </section>
  );
}

export function ConfirmDelete(props: {
  name: string;
  description: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return <ConfirmAction title={`Eliminare “${props.name}”?`} confirmLabel="Conferma eliminazione" {...props} />;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-5 py-10 text-center text-sm text-ink/50">{children}</p>;
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

export function displayDateTime(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    timeZone: ROME,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
