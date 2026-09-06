"use client";

import { useEffect, useId, useState } from "react";
import type { ReactNode } from "react";

type Props = {
  /** Word the organiser has to type. Defaults to RESET. */
  word?: string;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Typed confirmation for anything that wipes the database. A checkbox is too
 * easy to tick by accident, so the word has to be typed out in full.
 *
 * The inner dialog only exists while open, so the typed word is discarded on
 * unmount and can never carry over into the next confirmation.
 */
export function ConfirmResetDialog({ open, ...props }: Props & { open: boolean }) {
  if (!open) return null;
  return <Dialog {...props} />;
}

function Dialog({
  word = "RESET",
  title,
  children,
  confirmLabel,
  pending,
  onConfirm,
  onCancel,
}: Props) {
  const [typed, setTyped] = useState("");
  const headingId = useId();
  const inputId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pending, onCancel]);

  const matches = typed === word;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/45 px-5 py-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !pending) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="panel-in w-full max-w-[420px] rounded-[22px] border-[1.5px] border-accent bg-white p-5 shadow-[0_18px_44px_rgba(28,27,26,0.22)]"
      >
        <h2
          id={headingId}
          className="text-[16px] font-extrabold uppercase tracking-[0.06em] text-accent"
        >
          {title}
        </h2>

        <div className="mt-2.5 space-y-2 text-[13px] leading-[1.5] text-ink/75">
          {children}
        </div>

        <label htmlFor={inputId} className="lbl mt-4 block">
          Scrivi {word} per confermare
        </label>
        <input
          id={inputId}
          autoFocus
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matches && !pending) onConfirm();
          }}
          autoComplete="off"
          spellCheck={false}
          disabled={pending}
          placeholder={word}
          className="tn mt-1.5 w-full rounded-xl border-[1.5px] border-ink/20 bg-white px-3 py-2.5 text-[15px] font-bold tracking-[0.08em] outline-none focus:border-accent disabled:opacity-60"
        />

        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="flex-1 rounded-xl border-[1.5px] border-ink/20 px-3 py-2.5 text-[14px] font-bold text-ink/70 transition-colors hover:border-ink/40 disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!matches || pending}
            className="flex-1 rounded-xl bg-accent px-3 py-2.5 text-[14px] font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Attendi…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
