"use client";

import type { AdminError } from "@/app/lib/adminTypes";

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="alert"
      className="mt-4 rounded-xl border border-accent bg-tint p-4"
    >
      <div className="text-[15px] font-semibold  text-accent">
        {title}
      </div>
      <div className="mt-2 space-y-2 text-[15px] leading-[1.5] text-ink/80">
        {children}
      </div>
    </div>
  );
}

/** The raw API message, kept verbatim for anything the copy above paraphrases. */
function Raw({ message }: { message: string }) {
  return (
    <p className="text-[13px] leading-[1.45] text-ink/55">{message}</p>
  );
}

export function ErrorPanel({
  error,
  source = "csv",
}: {
  error: AdminError;
  /** Where an import's data came from, which changes the advice on a mismatch. */
  source?: "csv" | "api";
}) {
  switch (error.kind) {
    case "missing_key":
    case "unauthorized":
      return (
        <Panel title="Sessione scaduta">
          <p>La sessione non è più valida. Accedi di nuovo con la tua email per continuare.</p>
          <Raw message={error.message} />
        </Panel>
      );

    case "forbidden":
      return (
        <Panel title="Non hai i permessi">
          <p>Questa operazione è riservata al super amministratore.</p>
          <Raw message={error.message} />
        </Panel>
      );

    case "disabled":
      return (
        <Panel title="API admin non disponibile">
          <p>Il backend ha rifiutato la richiesta perché non è configurato. Riprovare non serve.</p>
          <Raw message={error.message} />
        </Panel>
      );

    case "throttled":
      return (
        <Panel title="Troppi tentativi">
          <p>
            Da questo indirizzo sono arrivati troppi codici sbagliati o troppe richieste, quindi il server blocca i
            tentativi per un quarto d&apos;ora. Riprova più tardi.
          </p>
          <Raw message={error.message} />
        </Panel>
      );

    case "conflict":
      return (
        <Panel title="Conflitto con i dati esistenti">
          <p>{conflictText(error.message)}</p>
          <Raw message={error.message} />
        </Panel>
      );

    case "verification":
      if (source === "api") {
        return (
          <Panel title="I dati di melee.gg non coincidono">
            <p>
              Il backend ha ricalcolato la classifica dai match scaricati da melee.gg e non torna con la classifica di
              melee.gg, quindi ha annullato l&apos;import. <strong>Non è stato scritto nulla</strong>.
            </p>
            <p>
              Controlla che tutti i risultati siano stati inseriti su melee.gg e riprova.
            </p>
            <pre className="tn max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-ink/15 bg-surface p-3 font-mono text-[13px] leading-[1.5] text-ink/80">
              {error.message}
            </pre>
          </Panel>
        );
      }
      return (
        <Panel title="I due file non coincidono">
          <p>
            Il backend ha ricalcolato la classifica dai match e non torna con il
            file delle standings, quindi ha annullato l&apos;import.{" "}
            <strong>Non è stato scritto nulla</strong>: l&apos;evento e i dati
            esistenti sono rimasti invariati.
          </p>
          <p>
            Quasi sempre vuol dire che i due file sono stati scaricati in
            momenti diversi del torneo. Riscaricali entrambi da melee.gg e
            riprova.
          </p>
          <pre className="tn max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-ink/15 bg-surface p-3 font-mono text-[13px] leading-[1.5] text-ink/80">
            {error.message}
          </pre>
        </Panel>
      );

    case "network":
      return (
        <Panel title="API non raggiungibile">
          <p>
            Non è stato possibile contattare l&apos;API. Non sappiamo se la
            richiesta sia arrivata, quindi controlla lo stato prima di
            riprovare.
          </p>
          <Raw message={error.message} />
        </Panel>
      );

    default:
      return (
        <Panel title="Operazione non riuscita">
          <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-[1.5] text-ink/80">
            {error.message}
          </pre>
        </Panel>
      );
  }
}

/** Inline, field-level version of a 400 message. */
export function FieldError({ message }: { message: string }) {
  return (
    <p className="mt-1.5 text-[13px] font-semibold text-accent">{message}</p>
  );
}

/** The conflicts the backend names, in plain words; anything else gets the general one. */
function conflictText(message: string) {
  if (message.includes("another event already has this melee tournament"))
    return "Questo torneo Melee è già associato a un'altra tappa. Controlla l'ID o toglilo dall'altra tappa.";
  if (message.includes("imported from another melee tournament"))
    return "I risultati della tappa vengono da un altro torneo Melee: reimpostali prima di cambiarlo.";
  if (message.includes("played as another melee tournament"))
    return "La tappa è associata a un altro torneo Melee: si importano solo i suoi risultati.";
  return "Il torneo è già stato importato oppure la tappa ha già dei risultati. Aggiorna la pagina e controlla la tappa.";
}
