import { RULES } from "@/app/lib/rules";
import { Section } from "../ui";

export const metadata = { title: "Regolamento · Lega Pauper Milano" };

/** The rules sections, retitled in our voice. The text stays the same. */
const TITLES: Record<string, string> = {
  "Orari e iscrizioni": "puntuali, per favore",
  Preiscrizioni: "tenersi il posto",
  "Regolamento completo": "le regole vere",
};

export default function RulesPage() {
  return (
    <div className="rg-stack">
      <Section as="h1" label="regolamento" title="come funziona" aside="Le cose da sapere prima di presentarsi al tavolo.">
        <dl className="grid gap-x-8 sm:grid-cols-2">
          {RULES.specs.map((s) => (
            <div key={s.label} className="rg-hr py-4">
              <dt className="rg-muted text-[14px] font-semibold">{s.label.toLowerCase()}</dt>
              <dd className="mt-1">
                <span className="rg-display block text-[21px] leading-snug">{s.value}</span>
                {"detail" in s && s.detail && <span className="rg-muted mt-0.5 block text-[15px]">{s.detail}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section label="nel dettaglio" title="iscrizioni e regole">
        <div>
          {RULES.sections.map((sec, i) => (
            <section key={sec.title} className={`${i ? "rg-hr mt-8 pt-8" : ""}`}>
              <p className="rg-eyebrow">{sec.title}</p>
              <h3 className="rg-display rg-tight mt-1 text-[26px] leading-tight lg:text-[32px]">
                {TITLES[sec.title] ?? sec.title.toLowerCase()}
              </h3>
              {sec.body.map((b) => (
                <p key={b} className="mt-3 text-[16px] leading-relaxed lg:text-[17px]">
                  {b}
                </p>
              ))}
            </section>
          ))}

          <div className="mt-8">
            <a href={RULES.discord} target="_blank" rel="noopener noreferrer" className="rg-btn rg-btn-fill">
              apri il discord
            </a>
          </div>
        </div>
      </Section>
    </div>
  );
}
