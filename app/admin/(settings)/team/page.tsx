"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { AdminError, Team, TeamPlayer } from "@/app/lib/adminTypes";
import { EASTER_EGGS, EFFECT_LABELS } from "@/app/lib/easter";
import { useAdmin } from "../../AdminShell";
import { ErrorPanel, FieldError } from "../../ErrorPanel";
import { CONTROL, CONTROL_INVALID, Field } from "../../fields";
import {
  BUTTON,
  BUTTON_DANGER,
  BUTTON_PRIMARY,
  ConfirmDialog,
  Dialog,
  DIALOG_FORM,
  DialogBody,
  DialogFooter,
  EmptyState,
  notify,
  PageHeader,
  SectionHeader,
  TABLE,
  TD,
  TH,
} from "../../dashboardUi";

type Logo = Team["logo"];

/**
 * A logo from an SVG file: its box and its shapes as one path. Paths are
 * taken as they are, polygons, polylines and rectangles become paths;
 * anything the site couldn't draw the same (text, embedded pictures,
 * transforms, curves drawn as circles) is refused with a reason, rather
 * than saved half right.
 */
function logoFrom(svgText: string): { logo: Logo } | { error: string } {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const svg = doc.documentElement;
  if (svg.nodeName !== "svg" || doc.querySelector("parsererror")) return { error: "Il file non è un SVG leggibile." };
  if (svg.querySelector("text, image, use, foreignObject")) {
    return { error: "Il file contiene testi o immagini: servono solo forme. Converti il testo in tracciati e riprova." };
  }
  if (svg.querySelector("circle, ellipse, line")) {
    return { error: "Il file contiene cerchi o linee: convertili in tracciati e riprova." };
  }
  if (svg.querySelector("[transform]")) {
    return { error: "Il file usa delle trasformazioni: applicale alle forme (\"converti in tracciati\") e riprova." };
  }
  const box =
    svg.getAttribute("viewBox")?.trim().split(/[\s,]+/).join(" ") ??
    (svg.getAttribute("width") && svg.getAttribute("height")
      ? `0 0 ${parseFloat(svg.getAttribute("width")!)} ${parseFloat(svg.getAttribute("height")!)}`
      : "");
  if (!/^-?[\d.]+( -?[\d.]+){3}$/.test(box)) return { error: "Il file non dice quanto è grande il disegno (manca il viewBox)." };
  const parts: string[] = [];
  svg.querySelectorAll("path, polygon, polyline, rect").forEach((el) => {
    if (el.nodeName === "path") {
      const d = el.getAttribute("d")?.trim();
      if (d) parts.push(d);
    } else if (el.nodeName === "rect") {
      const n = (a: string) => parseFloat(el.getAttribute(a) ?? "0") || 0;
      const [x, y, w, h] = [n("x"), n("y"), n("width"), n("height")];
      // A full-size background rectangle is the picture's ground, not the logo.
      if (w > 0 && h > 0 && !(w >= parseFloat(box.split(" ")[2]) && h >= parseFloat(box.split(" ")[3]))) {
        parts.push(`M${x} ${y}H${x + w}V${y + h}H${x}Z`);
      }
    } else {
      const pts = el.getAttribute("points")?.trim();
      if (pts) parts.push(`M${pts}${el.nodeName === "polygon" ? "Z" : ""}`);
    }
  });
  const path = parts.join("");
  if (!path) return { error: "Nel file non ci sono forme da usare come logo." };
  if (!/^[MmLlHhVvCcSsQqTtAaZz0-9eE.,+\-\s]+$/.test(path)) return { error: "Le forme del file non si possono leggere." };
  if (path.length > 200_000) return { error: "Il logo è troppo dettagliato: semplificalo e riprova." };
  return { logo: { view_box: box, path } };
}

function LogoPreview({ logo, size = 56 }: { logo: Logo; size?: number }) {
  return (
    <svg
      viewBox={logo.view_box}
      width={size}
      height={size}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
      className="shrink-0 text-ink/70"
    >
      <path fill="currentColor" fillRule="evenodd" d={logo.path} />
    </svg>
  );
}

/** Name and logo, for a new team or an existing one. */
function TeamForm({
  initial,
  busy,
  error,
  onSubmit,
  submitLabel,
}: {
  initial?: { name: string; logo: Logo };
  busy: boolean;
  error: AdminError | null;
  onSubmit: (name: string, logo: Logo) => void;
  submitLabel: string;
}) {
  const nameId = useId();
  const fileId = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [logo, setLogo] = useState<Logo | null>(initial?.logo ?? null);
  const [fileError, setFileError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    setFileError(null);
    if (!file) return;
    const read = logoFrom(await file.text());
    if ("error" in read) {
      setFileError(read.error);
      return;
    }
    setLogo(read.logo);
  }

  const nameError = error?.kind === "conflict" ? "C'è già un team con questo nome." : null;
  return (
    <form
      className={DIALOG_FORM}
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim() && logo) onSubmit(name.trim(), logo);
      }}
    >
      <DialogBody>
        <Field label="Nome" htmlFor={nameId}>
          <input
            id={nameId}
            className={`${CONTROL} ${nameError ? CONTROL_INVALID : ""}`}
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            autoFocus
            disabled={busy}
            required
          />
          {nameError && <FieldError message={nameError} />}
        </Field>
        <Field label="Logo (file SVG)" htmlFor={fileId}>
          <div className="flex items-center gap-4">
            {logo && <LogoPreview logo={logo} size={64} />}
            <input
              id={fileId}
              type="file"
              accept=".svg,image/svg+xml"
              className="text-[14px] text-ink/70 file:mr-3 file:rounded-lg file:border file:border-ink/12 file:bg-surface file:px-3 file:py-2 file:text-ink"
              disabled={busy}
              onChange={(e) => void pick(e.target.files?.[0])}
            />
          </div>
          {fileError ? (
            <FieldError message={fileError} />
          ) : (
            <p className="mt-1 text-[13px] text-ink/50">
              Sul sito il logo è in un solo colore, tenue, sparso dietro la card dei giocatori del team.
            </p>
          )}
        </Field>
        {error && !nameError && <ErrorPanel error={error} />}
      </DialogBody>
      <DialogFooter>
        <button type="submit" className={BUTTON_PRIMARY} disabled={busy || !name.trim() || !logo}>
          {busy ? "Attendi…" : submitLabel}
        </button>
      </DialogFooter>
    </form>
  );
}

/** Who is in the team: every player, searchable, ticked or not; those in another team say which. */
function MembersForm({
  team,
  teams,
  players,
  busy,
  onSubmit,
}: {
  team: Team;
  teams: Team[];
  players: TeamPlayer[];
  busy: boolean;
  onSubmit: (ids: number[]) => void;
}) {
  const searchId = useId();
  const [chosen, setChosen] = useState(() => new Set(team.players.map((p) => p.id)));
  const [q, setQ] = useState("");
  const elsewhere = useMemo(() => {
    const m = new Map<number, string>();
    for (const t of teams) if (t.id !== team.id) for (const p of t.players) m.set(p.id, t.name);
    return m;
  }, [teams, team.id]);
  const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const shown = players
    .filter((p) => !q.trim() || norm(p.display_name).includes(norm(q.trim())))
    // The members first, then everyone else.
    .sort((a, b) => Number(chosen.has(b.id)) - Number(chosen.has(a.id)));

  return (
    <form
      className={DIALOG_FORM}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit([...chosen]);
      }}
    >
      <DialogBody>
        <Field label="Cerca un giocatore" htmlFor={searchId}>
          <input
            id={searchId}
            className={CONTROL}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome o cognome"
            autoComplete="off"
            disabled={busy}
          />
        </Field>
        <p className="text-[13px] text-ink/50">
          {chosen.size === 1 ? "1 giocatore nel team." : `${chosen.size} giocatori nel team.`} Chi è già in un altro team
          viene spostato in questo.
        </p>
        <ul className="max-h-[50vh] overflow-y-auto rounded-xl border border-ink/10">
          {shown.map((p) => {
            const other = elsewhere.get(p.id);
            return (
              <li key={p.id} className="border-b border-ink/[0.07] last:border-b-0">
                <label className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-ink/[0.03]">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--color-accent,#fa1e32)]"
                    checked={chosen.has(p.id)}
                    disabled={busy}
                    onChange={(e) =>
                      setChosen((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(p.id);
                        else next.delete(p.id);
                        return next;
                      })
                    }
                  />
                  <span className="min-w-0 flex-1 truncate">{p.display_name}</span>
                  {other && !chosen.has(p.id) && <span className="shrink-0 text-[13px] text-ink/45">in {other}</span>}
                </label>
              </li>
            );
          })}
          {shown.length === 0 && <li className="px-3 py-4 text-[14px] text-ink/50">Nessun giocatore con questo nome.</li>}
        </ul>
      </DialogBody>
      <DialogFooter>
        <button type="submit" className={BUTTON_PRIMARY} disabled={busy}>
          {busy ? "Attendi…" : "Salva i membri"}
        </button>
      </DialogFooter>
    </form>
  );
}

type Modal =
  | { kind: "new" }
  | { kind: "edit"; team: Team }
  | { kind: "members"; team: Team }
  | { kind: "delete"; team: Team };

/**
 * Team: the watermark of a team's logo behind its players' pages. The super
 * admin's alone. Below, read only, who has which easter egg: those are set
 * in the code, this is the record of them.
 */
export default function TeamsPage() {
  const { me, call } = useAdmin();
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [players, setPlayers] = useState<TeamPlayer[] | null>(null);
  const [modal, setModal] = useState<Modal | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AdminError | null>(null);
  const [formError, setFormError] = useState<AdminError | null>(null);

  useEffect(() => {
    if (!me.is_super) return;
    let cancelled = false;
    (async () => {
      const [t, p] = await Promise.all([call<Team[]>("/api/admin/teams"), call<TeamPlayer[]>("/api/admin/players")]);
      if (cancelled) return;
      if (t.ok) setTeams(t.data);
      else setError(t.error);
      if (p.ok) setPlayers(p.data);
      else setError(p.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [me.is_super, call]);

  if (!me.is_super) {
    return <PageHeader section title="Team" meta="Solo il super amministratore può gestire i team." />;
  }

  const open = (m: Modal) => {
    setFormError(null);
    setModal(m);
  };
  const replace = (t: Team) =>
    setTeams((prev) => {
      // A player put in this team leaves any other.
      const moved = new Set(t.players.map((p) => p.id));
      const rest = (prev ?? []).filter((x) => x.id !== t.id).map((x) => ({ ...x, players: x.players.filter((p) => !moved.has(p.id)) }));
      return [...rest, t].sort((a, b) => a.name.localeCompare(b.name, "it"));
    });

  async function save(name: string, logo: Logo, team?: Team) {
    setBusy(true);
    setFormError(null);
    const res = await call<Team>(team ? `/api/admin/teams?id=${team.id}` : "/api/admin/teams", {
      method: team ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, logo }),
    });
    setBusy(false);
    if (!res.ok) return setFormError(res.error);
    replace(res.data);
    if (team) {
      setModal(null);
      notify(`${res.data.name}: salvato.`);
    } else {
      // A new team goes straight on to its members.
      setModal({ kind: "members", team: res.data });
      notify(`${res.data.name} creato: ora scegli chi ne fa parte.`);
    }
  }

  async function saveMembers(team: Team, ids: number[]) {
    setBusy(true);
    setFormError(null);
    const res = await call<Team>(`/api/admin/teams?id=${team.id}&players`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_ids: ids }),
    });
    setBusy(false);
    if (!res.ok) return setFormError(res.error);
    replace(res.data);
    setModal(null);
    notify(`${res.data.name}: ${res.data.players.length === 1 ? "1 giocatore" : `${res.data.players.length} giocatori`}.`);
  }

  async function remove(team: Team) {
    setBusy(true);
    setError(null);
    const res = await call(`/api/admin/teams?id=${team.id}`, { method: "DELETE" });
    setBusy(false);
    setModal(null);
    if (!res.ok) return setError(res.error);
    setTeams((prev) => (prev ?? []).filter((t) => t.id !== team.id));
    notify(`${team.name} eliminato: i suoi giocatori non hanno più un team.`);
  }

  return (
    <>
      <PageHeader
        section
        title="Team"
        meta="Il logo di un team compare in filigrana dietro la card dei suoi giocatori sul sito. Ogni giocatore sta in un team al massimo."
        actions={
          <button type="button" className={BUTTON_PRIMARY} onClick={() => open({ kind: "new" })}>
            Nuovo team
          </button>
        }
      />

      {error && (
        <div className="mb-6">
          <ErrorPanel error={error} />
        </div>
      )}

      <div className="card overflow-x-auto">
        {teams === null ? (
          <EmptyState>Caricamento…</EmptyState>
        ) : teams.length === 0 ? (
          <EmptyState>Ancora nessun team.</EmptyState>
        ) : (
          <table className={TABLE}>
            <thead>
              <tr>
                <th className={`${TH} w-px`}>Logo</th>
                <th className={TH}>Team</th>
                <th className={`${TH} w-px whitespace-nowrap`} />
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr key={t.id}>
                  <td className={`${TD} py-2`}>
                    <LogoPreview logo={t.logo} size={40} />
                  </td>
                  <td className={`${TD} max-w-0 py-2`}>
                    <span className="block truncate font-medium">{t.name}</span>
                    <span className="block truncate text-[13px] text-ink/50">
                      {t.players.length === 0 ? "Nessun giocatore" : t.players.map((p) => p.display_name).join(", ")}
                    </span>
                  </td>
                  <td className={`${TD} py-2 whitespace-nowrap`}>
                    <span className="flex justify-end gap-1">
                      <button type="button" className={BUTTON} disabled={!players} onClick={() => open({ kind: "members", team: t })}>
                        Giocatori
                      </button>
                      <button type="button" className={BUTTON} onClick={() => open({ kind: "edit", team: t })}>
                        Modifica
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-10">
        <SectionHeader title="Effetti personali" aside="Impostati nel codice, non da qui" />
        <div className="card overflow-x-auto">
          <table className={TABLE}>
            <thead>
              <tr>
                <th className={TH}>Giocatore</th>
                <th className={TH}>Effetto</th>
              </tr>
            </thead>
            <tbody>
              {EASTER_EGGS.map((e) => (
                <tr key={e.playerId}>
                  <td className={`${TD} font-medium`}>
                    <a className="hover:underline" href={`/giocatori/${e.playerId}`} target="_blank" rel="noopener">
                      {e.name}
                    </a>
                  </td>
                  <td className={`${TD} text-ink/65`}>{EFFECT_LABELS[e.effect]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal?.kind === "new" && (
        <Dialog title="Nuovo team" description="Un nome e il logo in SVG." busy={busy} onClose={() => setModal(null)}>
          <TeamForm busy={busy} error={formError} submitLabel="Crea" onSubmit={(name, logo) => void save(name, logo)} />
        </Dialog>
      )}

      {modal?.kind === "edit" && (
        <Dialog title={modal.team.name} description="Nome e logo del team." busy={busy} onClose={() => setModal(null)}>
          <TeamForm
            initial={modal.team}
            busy={busy}
            error={formError}
            submitLabel="Salva"
            onSubmit={(name, logo) => void save(name, logo, modal.team)}
          />
          <div className="px-5 pb-5">
            <section className="rounded-xl border border-accent/30 px-3 py-3">
              <h3 className="text-[15px] font-medium text-ink">Zona pericolosa</h3>
              <p className="mt-0.5 text-[13px] text-ink/50">I suoi giocatori resteranno senza team e senza filigrana.</p>
              <button
                type="button"
                className={`${BUTTON_DANGER} mt-2 -ml-3`}
                disabled={busy}
                onClick={() => setModal({ kind: "delete", team: modal.team })}
              >
                Elimina team
              </button>
            </section>
          </div>
        </Dialog>
      )}

      {modal?.kind === "members" && players && teams && (
        <Dialog title={`Giocatori di ${modal.team.name}`} busy={busy} onClose={() => setModal(null)}>
          <MembersForm
            team={modal.team}
            teams={teams}
            players={players}
            busy={busy}
            onSubmit={(ids) => void saveMembers(modal.team, ids)}
          />
          {formError && (
            <div className="px-5 pb-5">
              <ErrorPanel error={formError} />
            </div>
          )}
        </Dialog>
      )}

      {modal?.kind === "delete" && (
        <ConfirmDialog
          title={`Eliminare ${modal.team.name}?`}
          confirmLabel="Elimina"
          busy={busy}
          onCancel={() => !busy && setModal(null)}
          onConfirm={() => void remove(modal.team)}
        >
          Il logo sparisce dalle pagine dei suoi giocatori, che restano senza team. Potrai crearlo di nuovo caricando il
          logo.
        </ConfirmDialog>
      )}
    </>
  );
}
