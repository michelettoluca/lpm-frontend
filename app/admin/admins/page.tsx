"use client";

import { useEffect, useId, useState } from "react";
import type { AdminError, AdminListEntry } from "@/app/lib/adminTypes";
import { useAdmin } from "../AdminShell";
import { ErrorPanel, FieldError } from "../ErrorPanel";
import { CONTROL, CONTROL_INVALID, Field } from "../fields";
import {
  Badge,
  BUTTON_DANGER,
  BUTTON_PRIMARY,
  ConfirmDialog,
  DetailList,
  Dialog,
  DIALOG_FORM,
  DialogBody,
  DialogFooter,
  displayDate,
  EmptyState,
  notify,
  PageHeader,
  Pagination,
  rowOpens,
  TABLE,
  TD,
  TH,
  usePage,
} from "../dashboardUi";

export default function AdminsPage() {
  const { me, call } = useAdmin();
  const [admins, setAdmins] = useState<AdminListEntry[] | null>(null);
  const [email, setEmail] = useState("");
  const [removing, setRemoving] = useState<AdminListEntry | null>(null);
  const [selected, setSelected] = useState<AdminListEntry | null>(null);
  const [adding, setAdding] = useState(false);
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

  const { rows, pager } = usePage(admins ?? []);

  if (!me.is_super) {
    return (
      <PageHeader title="Amministratori" meta="Solo il super amministratore può gestire gli amministratori." />
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
    setAdding(false);
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
        title="Amministratori"
        meta="Chi è in questa lista accede alla dashboard con un codice inviato alla sua email."
        actions={
          <button
            type="button"
            className={BUTTON_PRIMARY}
            onClick={() => {
              setError(null);
              setAdding(true);
            }}
          >
            Aggiungi amministratore
          </button>
        }
      />

      {error && !(adding && emailError) && (
        <div className="mb-6">
          <ErrorPanel error={error} />
        </div>
      )}

      <div className="card overflow-x-auto">
        {admins === null ? (
          <EmptyState>Caricamento…</EmptyState>
        ) : (
          <table className={TABLE}>
            <thead>
              <tr>
                <th className={TH}>Email</th>
                <th className={`${TH} hidden w-px whitespace-nowrap sm:table-cell`}>Ruolo</th>
                <th className={`${TH} hidden w-px whitespace-nowrap sm:table-cell`}>Aggiunto il</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} {...rowOpens(() => setSelected(a))}>
                  <td className={`${TD} max-w-0 py-2`}>
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium">{a.email}</span>
                      {a.id === me.id && <Badge>Tu</Badge>}
                    </span>
                    {/* On a phone the role sits under the email instead of in its own column. */}
                    <span className="block text-[13px] text-ink/50 sm:hidden">{a.is_super ? "Super admin" : "Admin"}</span>
                  </td>
                  <td className={`${TD} hidden whitespace-nowrap text-ink/65 sm:table-cell`}>
                    {a.is_super ? "Super admin" : "Admin"}
                  </td>
                  <td className={`${TD} tn hidden whitespace-nowrap text-ink/55 sm:table-cell`}>{displayDate(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination {...pager} />
      </div>

      {adding && (
        <Dialog
          title="Aggiungi amministratore"
          description="Riceverà un codice di accesso alla sua email ogni volta che entra."
          busy={pending}
          onClose={() => setAdding(false)}
        >
          <form onSubmit={add} className={DIALOG_FORM}>
            <DialogBody>
              <Field label="Email" htmlFor={emailId}>
                <input
                  id={emailId}
                  type="email"
                  className={`${CONTROL} ${emailError ? CONTROL_INVALID : ""}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@esempio.it"
                  autoComplete="off"
                  autoFocus
                  disabled={pending}
                  required
                />
                {emailError && (
                  <FieldError
                    message={error?.kind === "conflict" ? "Questa email è già un amministratore." : "Email non valida."}
                  />
                )}
              </Field>
            </DialogBody>
            <DialogFooter>
              <button type="submit" className={BUTTON_PRIMARY} disabled={pending || !email.trim()}>
                {pending ? "Attendi…" : "Aggiungi"}
              </button>
            </DialogFooter>
          </form>
        </Dialog>
      )}

      {selected && (
        <Dialog title={selected.email} description="Amministratore della dashboard" onClose={() => setSelected(null)}>
          <DialogBody>
            <DetailList
              items={[
                ["Ruolo", selected.is_super ? "Super admin" : "Admin"],
                ["Aggiunto il", <span key="d" className="tn">{displayDate(selected.created_at)}</span>],
                ["Accesso", "Codice via email"],
              ]}
            />
            {selected.is_super ? (
              <p>Il super amministratore non può essere rimosso.</p>
            ) : (
              <section className="rounded-xl border border-accent/30 px-3 py-3">
                <h3 className="text-[15px] font-medium text-ink">Zona pericolosa</h3>
                <p className="mt-0.5 text-[13px] text-ink/50">
                  Non potrà più accedere alla dashboard e la sua sessione verrà chiusa subito.
                </p>
                <button
                  type="button"
                  className={`${BUTTON_DANGER} mt-2 -ml-3`}
                  disabled={pending}
                  onClick={() => {
                    setRemoving(selected);
                    setSelected(null);
                  }}
                >
                  Rimuovi amministratore
                </button>
              </section>
            )}
          </DialogBody>
        </Dialog>
      )}

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
