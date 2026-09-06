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
      className="mt-4 rounded-[18px] border-[1.5px] border-accent bg-tint p-4"
    >
      <div className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-accent">
        {title}
      </div>
      <div className="mt-2 space-y-2 text-[13px] leading-[1.5] text-ink/80">
        {children}
      </div>
    </div>
  );
}

/** The raw API message, kept verbatim for anything the copy above paraphrases. */
function Raw({ message }: { message: string }) {
  return (
    <p className="text-[12px] leading-[1.45] text-ink/55">{message}</p>
  );
}

export function ErrorPanel({
  error,
}: {
  error: AdminError;
}) {
  switch (error.kind) {
    case "missing_key":
      return (
        <Panel title="Sessione scaduta">
          <p>
            Non c&apos;è più una sessione admin valida. Inserisci di nuovo la
            chiave per continuare.
          </p>
          <Raw message={error.message} />
        </Panel>
      );

    case "disabled":
      return (
        <Panel title="API admin disattivata sul server">
          <p>
            Il backend non ha una chiave admin configurata, quindi tutti gli
            endpoint admin sono spenti. Non è un problema di login e riprovare
            non serve: va sistemata la configurazione del server.
          </p>
          <Raw message={error.message} />
        </Panel>
      );

    case "unauthorized":
      return (
        <Panel title="Chiave admin rifiutata">
          <p>
            Il backend ha risposto che la chiave non è valida. Controlla di
            averla scritta per intero, senza spazi in fondo. Se è stata ruotata
            di recente, chiedi quella nuova. Se eri già dentro, la sessione è
            stata chiusa.
          </p>
          <Raw message={error.message} />
        </Panel>
      );

    case "throttled":
      return (
        <Panel title="Troppi tentativi">
          <p>
            Da questo indirizzo sono arrivate troppe chiavi sbagliate, quindi il
            server rifiuta ogni tentativo per un quarto d&apos;ora, anche con la
            chiave giusta. Recuperala e riprova più tardi.
          </p>
          <Raw message={error.message} />
        </Panel>
      );

    case "conflict":
      return (
        <Panel title="Conflitto con i dati esistenti">
          <p>
            Il torneo è già stato importato oppure l&apos;evento selezionato ha
            già dei risultati. Aggiorna l&apos;elenco e verifica l&apos;evento scelto.
          </p>
          <Raw message={error.message} />
        </Panel>
      );

    case "verification":
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
          <pre className="tn max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-ink/15 bg-white p-3 font-mono text-[12px] leading-[1.5] text-ink/80">
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
          <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-[1.5] text-ink/80">
            {error.message}
          </pre>
        </Panel>
      );
  }
}

/** Inline, field-level version of a 400 message. */
export function FieldError({ message }: { message: string }) {
  return (
    <p className="mt-1.5 text-[12px] font-semibold text-accent">{message}</p>
  );
}
