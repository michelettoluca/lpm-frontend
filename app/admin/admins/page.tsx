"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import type { AdminError, AdminListEntry } from "@/app/lib/adminTypes";
import { useAdmin } from "../AdminShell";
import { ErrorPanel, FieldError } from "../ErrorPanel";
import { CONTROL, CONTROL_INVALID } from "../fields";
import {
  Badge,
  BUTTON_DANGER,
  BUTTON_PRIMARY,
  ConfirmDialog,
  displayDate,
  EmptyState,
  notify,
  PageHeader,
} from "../dashboardUi";

export default function AdminsPage() {
  const { me, call } = useAdmin();
  const [admins, setAdmins] = useState<AdminListEntry[] | null>(null);
  const [email, setEmail] = useState("");
  const [removing, setRemoving] = useState<AdminListEntry | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AdminError | null>(null);
  const emailId = useId();

  useEffect(() => {
    if (!me.is_super) return;
    let cancelled = false;
    (async () => {
      const res = await call<AdminListEntry[]>("/api/admin/admins");
      if (cancelled) return;
      if (res.ok) setAdmins(res.data);
      else setError(res.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [me.is_super, call]);

  const back = (
    <Link href="/admin/seasons" className="text-[13px] font-bold text-ink/50 hover:text-ink">
      ← Stagioni
    </Link>
  );

  if (!me.is_super) {
    return (
      <PageHeader back={back} title="Amministratori" meta="Solo il super amministratore può gestire gli amministratori." />
    );
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (pending || !email.trim()) return;
    setPending(true);
    setError(null);
    const res = await call<AdminListEntry>("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    setPending(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setAdmins((prev) => [...(prev ?? []), res.data]);
    setEmail("");
    notify(`${res.data.email} ora è un amministratore: può accedere con la sua email.`);
  }

  async function remove(target: AdminListEntry) {
    setPending(true);
    setError(null);
    const res = await call(`/api/admin/admins?id=${target.id}`, { method: "DELETE" });
    setPending(false);
    setRemoving(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setAdmins((prev) => (prev ?? []).filter((a) => a.id !== target.id));
    notify(`${target.email} non è più un amministratore.`);
  }

  // A 400 about the email shows under the field; anything else as a panel.
  const emailError = error?.kind === "bad_request" || error?.kind === "conflict" ? error.message : null;

  return (
    <>
      <PageHeader
        back={back}
        title="Amministratori"
        meta="Chi è in questa lista accede alla dashboard con un codice inviato alla sua email."
      />

      {error && !emailError && (
        <div className="mb-6">
          <ErrorPanel error={error} />
        </div>
      )}

      <form onSubmit={add} className="card mb-6 p-5">
        <label htmlFor={emailId} className="lbl block">
          Aggiungi un amministratore
        </label>
        <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
          <input
            id={emailId}
            type="email"
            className={`${CONTROL} ${emailError ? CONTROL_INVALID : ""}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nome@esempio.it"
            autoComplete="off"
            disabled={pending}
            required
          />
          <button type="submit" className={`${BUTTON_PRIMARY} h-auto min-h-10 sm:w-auto`} disabled={pending || !email.trim()}>
            {pending ? "Attendi…" : "Aggiungi"}
          </button>
        </div>
        {emailError && (
          <FieldError
            message={error?.kind === "conflict" ? "Questa email è già un amministratore." : "Email non valida."}
          />
        )}
      </form>

      <div className="card">
        {admins === null ? (
          <EmptyState>Caricamento…</EmptyState>
        ) : (
          <ul>
            {admins.map((a) => (
              <li
                key={a.id}
                className="flex min-h-14 items-center justify-between gap-3 border-b border-ink/8 px-5 py-2.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-bold">{a.email}</span>
                    {a.is_super && <Badge tone="accent">Super admin</Badge>}
                    {a.id === me.id && !a.is_super && <Badge>Tu</Badge>}
                  </div>
                  <div className="tn mt-0.5 text-[12px] text-ink/45">aggiunto il {displayDate(a.created_at)}</div>
                </div>
                {!a.is_super && (
                  <button type="button" className={BUTTON_DANGER} disabled={pending} onClick={() => setRemoving(a)}>
                    Rimuovi
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {removing && (
        <ConfirmDialog
          title={`Rimuovere ${removing.email}?`}
          confirmLabel="Rimuovi"
          busy={pending}
          onCancel={() => !pending && setRemoving(null)}
          onConfirm={() => void remove(removing)}
        >
          Non potrà più accedere alla dashboard e la sua sessione verrà chiusa subito. Potrai aggiungerlo di nuovo in
          qualsiasi momento.
        </ConfirmDialog>
      )}
    </>
  );
}
