"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import { BUTTON, BUTTON_PRIMARY, Dialog, DIALOG_FORM, DialogBody, DialogFooter } from "./dashboardUi";
import { CONTROL } from "./fields";

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
 * Typed confirmation for anything that wipes data. A checkbox is too easy to
 * tick by accident, so the word has to be typed out in full.
 *
 * The inner dialog only exists while open, so the typed word is discarded on
 * unmount and can never carry over into the next confirmation.
 */
export function ConfirmResetDialog({ open, ...props }: Props & { open: boolean }) {
  if (!open) return null;
  return <TypedConfirm {...props} />;
}

function TypedConfirm({ word = "RESET", title, children, confirmLabel, pending, onConfirm, onCancel }: Props) {
  const [typed, setTyped] = useState("");
  const inputId = useId();
  const matches = typed === word;

  return (
    <Dialog title={title} busy={pending} onClose={onCancel}>
      <form
        className={DIALOG_FORM}
        onSubmit={(event) => {
          event.preventDefault();
          if (matches && !pending) onConfirm();
        }}
      >
        <DialogBody>
          {children}
          <div>
            <label htmlFor={inputId} className="lbl block">
              Scrivi {word} per confermare
            </label>
            <input
              id={inputId}
              autoFocus
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              disabled={pending}
              placeholder={word}
              className={`${CONTROL} tn mt-1.5 font-medium tracking-[0.08em]`}
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" className={BUTTON} onClick={onCancel} disabled={pending}>
            Annulla
          </button>
          <button type="submit" className={BUTTON_PRIMARY} disabled={!matches || pending}>
            {pending ? "Attendi…" : confirmLabel}
          </button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
