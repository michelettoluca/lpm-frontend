import type { ReactNode } from "react";
import { RULES } from "@/app/lib/rules";
import { Section } from "../ui";

export const metadata = { title: "Privacy · Lega Pauper Milano" };

/** Bump when the text below changes. */
const UPDATED = "16 ottobre 2026";

/**
 * What the site keeps in the browser. Only technical storage: nothing needs consent.
 * The admin's own preferences (page size, season) are left out: no visitor ever gets them.
 */
const STORAGE = [
  {
    name: "lpm-theme",
    kind: "memoria locale",
    what: "Ricorda il tema chiaro o scuro, se ne hai scelto uno.",
    lasts: "Finché non la cancelli dal browser.",
  },
  {
    name: "lpm-standings-view",
    kind: "memoria locale",
    what: "Ricorda la vista della classifica che hai scelto.",
    lasts: "Finché non la cancelli dal browser.",
  },
  {
    name: "lpm-deck-receipts",
    kind: "memoria locale",
    what: "Tiene la ricevuta dei mazzi indicati da questo telefono, così puoi rivederli o ritirarli. Ne conserva al massimo 20.",
    lasts: "Finché non la cancelli dal browser.",
  },
  {
    name: "lpm-admin-session",
    kind: "cookie tecnico",
    what: "Solo per gli organizzatori: mantiene l'accesso all'area riservata. Non è leggibile da JavaScript e viaggia solo verso le pagine dell'area riservata.",
    lasts: "30 giorni, o fino all'uscita.",
  },
];

function Block({ title, first = false, children }: { title: string; first?: boolean; children: ReactNode }) {
  return (
    <section className={first ? "" : "rg-hr mt-8 pt-8"}>
      <h3 className="rg-display rg-tight text-[24px] leading-tight lg:text-[28px]">{title}</h3>
      <div className="mt-3 space-y-3 text-[16px] leading-relaxed lg:text-[17px]">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="rg-stack">
      <Section
        as="h1"
        label="privacy"
        title="Cosa sappiamo di te"
        aside={`Poco, e solo per far girare la lega. Ultimo aggiornamento: ${UPDATED}.`}
      >
        <Block title="Chi siamo" first>
          <p>
            Il titolare del trattamento è la Lega Pauper Milano, che organizza i tornei del giovedì alla Casa dei
            Giochi, via Sant&apos;Uguzzone 8, Milano.
          </p>
          <p>
            Per qualsiasi domanda o richiesta sui tuoi dati scrivici sul{" "}
            <a className="rg-textlink" href={RULES.discord} target="_blank" rel="noopener noreferrer">
              server Discord della lega
            </a>{" "}
            oppure parlane con un organizzatore al tavolo.
          </p>
        </Block>

        <Block title="Niente pubblicità, niente tracciamento">
          <p>
            Il sito non usa cookie di profilazione, strumenti di analisi o pubblicità, e non carica risorse da altri
            siti: anche i caratteri sono serviti dal nostro server. Per questo non ti chiediamo il consenso ai cookie.
          </p>
        </Block>
      </Section>

      <Section
        label="cookie"
        title="Cosa resta nel browser"
        aside="Solo memoria tecnica, che serve a far funzionare quello che chiedi. Puoi cancellarla in ogni momento dalle impostazioni del browser."
      >
        <dl>
          {STORAGE.map((s, i) => (
            <div key={s.name} className={`${i ? "rg-hr" : ""} py-4`}>
              <dt className="flex flex-wrap items-baseline gap-x-3">
                <code className="text-[15px] font-semibold">{s.name}</code>
                <span className="rg-muted text-[14px]">{s.kind}</span>
              </dt>
              <dd className="mt-1 text-[16px] leading-relaxed">
                {s.what}
                <span className="rg-muted mt-0.5 block text-[15px]">{s.lasts}</span>
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section label="dati" title="Cosa trattiamo e perché">
        <Block title="Risultati dei tornei" first>
          <p>
            Quando giochi una tappa importiamo da Melee.gg, la piattaforma su cui ti iscrivi al torneo, il nome con cui
            sei registrato e i tuoi risultati: abbinamenti, punteggi e posizione. Li pubblichiamo nella classifica e
            nelle pagine delle tappe e dei giocatori, perché una lega senza classifica non è una lega. La base giuridica è il nostro
            legittimo interesse a organizzare il campionato e a pubblicarne i risultati.
          </p>
        </Block>

        <Block title="Il mazzo che giochi">
          <p>
            Se durante una tappa indichi il mazzo che giochi, salviamo il tuo nome e il tuo username su Melee.gg insieme
            all&apos;archetipo scelto. Il mazzo compare accanto al tuo nome nei risultati della tappa e nella tua pagina
            giocatore, e conta nelle statistiche sui mazzi giocati in lega. Indicarlo è facoltativo, e gli organizzatori
            possono inserirlo anche per te.
          </p>
          <p>
            Se per trovare l&apos;archetipo scrivi una descrizione nella ricerca, quel testo, al massimo 200 caratteri e
            senza il tuo nome, viene inviato a TypeSafe, il servizio che suggerisce gli archetipi più probabili.
          </p>
        </Block>

        <Block title="Organizzatori">
          <p>
            Per entrare nell&apos;area riservata gli organizzatori ricevono un codice via email. Conserviamo il loro
            indirizzo email e inviamo il codice tramite Resend, un servizio di invio email.
          </p>
        </Block>

        <Block title="Log del server">
          <p>
            Come ogni sito, il server registra le richieste che riceve, compreso l&apos;indirizzo IP, per sicurezza e
            per risolvere i problemi. Questi log non vengono usati per altro e sono conservati per un periodo limitato.
          </p>
        </Block>
      </Section>

      <Section label="terzi" title="Con chi li condividiamo">
        <Block title="Solo con chi ci serve" first>
          <p>Non vendiamo né cediamo i tuoi dati. Li trattano per nostro conto soltanto:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>il fornitore del server su cui gira il sito;</li>
            <li>Resend, per le email con il codice di accesso degli organizzatori;</li>
            <li>TypeSafe, per i suggerimenti nella ricerca degli archetipi.</li>
          </ul>
          <p>
            Alcuni di questi fornitori hanno sede fuori dall&apos;Unione europea: in quel caso il trasferimento avviene
            con le garanzie previste dal GDPR.
          </p>
        </Block>

        <Block title="Quanto li teniamo">
          <p>
            I risultati restano nell&apos;archivio storico della lega, così come i mazzi giocati di ogni tappa. I codici
            di accesso scadono dopo 10 minuti, le sessioni degli organizzatori dopo 30 giorni.
          </p>
        </Block>
      </Section>

      <Section label="diritti" title="Cosa puoi chiederci">
        <Block title="I tuoi diritti" first>
          <p>
            Puoi chiederci di vedere i dati che ti riguardano, di correggerli o di cancellarli, di limitarne
            l&apos;uso o di opporti al loro trattamento. Basta scriverci sul Discord della lega o chiederlo a un
            organizzatore.
          </p>
          <p>
            Se pensi che trattiamo i tuoi dati in modo scorretto puoi anche presentare reclamo al{" "}
            <a className="rg-textlink" href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">
              Garante per la protezione dei dati personali
            </a>
            .
          </p>
        </Block>
      </Section>
    </div>
  );
}
