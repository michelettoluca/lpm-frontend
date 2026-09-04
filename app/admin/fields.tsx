"use client";

import type { ReactNode } from "react";

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="lbl block">
        {label}
      </label>
      {hint && (
        <p className="mt-1 text-[12px] leading-[1.4] text-ink/50">{hint}</p>
      )}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export const CONTROL =
  "w-full rounded-xl border-[1.5px] border-ink/15 bg-white px-3 py-2.5 text-[14px] outline-none transition-colors focus:border-accent disabled:opacity-60";

export const CONTROL_INVALID = "border-accent";

/**
 * File input styled to match the rest of the form. The native control is
 * unstyleable across browsers, so the button half is drawn with `file:` variants.
 */
export function FileInput({
  id,
  name,
  onPick,
  invalid,
  disabled,
}: {
  id: string;
  name: string;
  onPick: (file: File | null) => void;
  invalid?: boolean;
  disabled?: boolean;
}) {
  return (
    <input
      id={id}
      name={name}
      type="file"
      accept=".csv,text/csv"
      disabled={disabled}
      onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      className={`${CONTROL} ${invalid ? CONTROL_INVALID : ""} cursor-pointer p-0 pr-3 text-[13px] file:mr-3 file:cursor-pointer file:rounded-l-[10px] file:border-0 file:bg-tint file:px-3 file:py-2.5 file:text-[13px] file:font-bold file:text-accent`}
    />
  );
}

export function SubmitButton({
  pending,
  disabled,
  children,
  pendingLabel,
  tone = "accent",
}: {
  pending: boolean;
  disabled: boolean;
  children: ReactNode;
  pendingLabel: string;
  tone?: "accent" | "outline";
}) {
  const base =
    "w-full rounded-xl px-4 py-3 text-[15px] font-extrabold transition-opacity disabled:cursor-not-allowed disabled:opacity-40";
  const skin =
    tone === "accent"
      ? "bg-accent text-white hover:opacity-90"
      : "border-[1.5px] border-accent text-accent hover:bg-accent hover:text-white";
  return (
    <button type="submit" disabled={disabled || pending} className={`${base} ${skin}`}>
      {pending ? pendingLabel : children}
    </button>
  );
}

/** Non-blocking heads-up, e.g. the two CSVs look swapped. */
export function Warning({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1.5 text-[12px] font-semibold leading-[1.4] text-accent">
      {children}
    </p>
  );
}
