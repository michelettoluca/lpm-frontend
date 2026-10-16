import type { ReactNode } from "react";
import { RULES } from "@/app/lib/rules";
import { Section } from "../ui";

export const metadata = { title: "Privacy · Lega Pauper Milano" };

/** Bump when the text below changes. */
const UPDATED = "16 ottobre 2026";

function Block({ title, first = false, children }: { title: string; first?: boolean; children: ReactNode }) {
  return (
    <section className={first ? "" : "rg-hr mt-8 pt-8"}>
      <h3 className="rg-display rg-tight text-[24px] leading-tight lg:text-[28px]">{title}</h3>
      <div className="mt-3 space-y-3 text-[16px] leading-relaxed lg:text-[17px]">{children}</div>
    </section>
  );
}

/**
 * The privacy notice. It names kinds of provider rather than the providers,
 * and says what the browser keeps rather than listing the keys, so it holds
 * when either changes; it must still say when data leaves the EU.
 */
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
            siti. Per questo non ti chiediamo il consenso ai cookie.
          </p>
          <p>
            Il tuo browser ricorda solo quello che serve a far funzionare quello che chiedi: il tema chiaro o scuro, la
            vista della classifica e la ricevuta dei mazzi indicati da quel telefono, per poterli ritirare. Gli
            organizzatori hanno in più un cookie tecnico che li tiene collegati all&apos;area riservata. Puoi cancellare
            tutto in ogni momento dalle impostazioni del browser.
          </p>
        </Block>
      </Section>

      <Section label="dati" title="Cosa trattiamo e perché">
        <Block title="Risultati dei tornei" first>
          <p>
            Quando giochi una tappa importiamo da Melee.gg, la piattaforma su cui ti iscrivi al torneo, il nome con cui
            sei registrato e i tuoi risultati. Li pubblichiamo nella classifica e nelle pagine delle tappe e dei
            giocatori: è il nostro legittimo interesse a organizzare il campionato e a pubblicarne i risultati.
          </p>
        </Block>

        <Block title="Il mazzo che giochi">
          <p>
            Se durante una tappa indichi il mazzo che giochi, lo salviamo con il tuo nome e il tuo username su
            Melee.gg. Compare accanto al tuo nome nei risultati e conta nelle statistiche della lega. Indicarlo è
            facoltativo, e gli organizzatori possono inserirlo anche per te.
          </p>
          <p>
            Il testo che scrivi nella ricerca degli archetipi, senza il tuo nome, passa da un servizio esterno che
            suggerisce i mazzi più probabili.
          </p>
        </Block>

        <Block title="Organizzatori e log">
          <p>
            Degli organizzatori conserviamo l&apos;indirizzo email, a cui inviamo il codice per entrare
            nell&apos;area riservata. Il server, come ogni sito, registra le richieste che riceve, compreso
            l&apos;indirizzo IP, solo per sicurezza e per risolvere i problemi.
          </p>
        </Block>
      </Section>

      <Section label="terzi" title="Con chi li condividiamo">
        <Block title="Solo con chi ci serve" first>
          <p>
            Non vendiamo né cediamo i tuoi dati. Li trattano per nostro conto solo il fornitore del server, un servizio
            di invio email e il servizio che suggerisce gli archetipi. Alcuni hanno sede fuori dall&apos;Unione
            europea: in quel caso il trasferimento avviene con le garanzie previste dal GDPR.
          </p>
        </Block>

        <Block title="Quanto li teniamo">
          <p>
            Risultati e mazzi giocati restano nell&apos;archivio storico della lega. I log del server sono conservati
            per un periodo limitato, i codici di accesso scadono dopo 10 minuti e le sessioni degli organizzatori dopo
            30 giorni.
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
