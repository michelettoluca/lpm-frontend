import type { Metagame as Data } from "@/app/lib/site";
import { ArchetypeBars } from "../../ArchetypeBars";
import { Section, plural } from "../../ui";

/** The tappa's decks: what was played most and what won. */
export function Metagame({ data }: { data: Data }) {
  const { archetypes } = data;
  const top = archetypes[0];
  const tiedTop = archetypes.filter((a) => a.players === top.players);
  const winner = archetypes.find((a) => a.best_rank === 1);

  return (
    <Section
      label="mazzi"
      title="cosa si è giocato"
      aside="I mazzi giocati durante la serata, raggruppati per archetipo."
    >
      <dl className="grid grid-cols-[1fr_1fr_auto] gap-x-4 sm:gap-x-6">
        <div className="min-w-0">
          <dt className="rg-eyebrow">{tiedTop.length > 1 ? "i più giocati" : "il più giocato"}</dt>
          <dd className="rg-display mt-1 text-[20px] leading-tight">
            {tiedTop.map((a) => a.name).join(", ")}{" "}
            <span className="rg-muted font-[family-name:var(--font-rg-text)] text-[13px] font-semibold tnum whitespace-nowrap">
              × {top.players}
            </span>
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="rg-eyebrow">vince con</dt>
          <dd className="rg-display mt-1 text-[20px] leading-tight">
            {winner ? <span className="text-[var(--rg-o)]">{winner.name}</span> : <span className="rg-muted">mazzo sconosciuto</span>}
          </dd>
        </div>
        <div>
          <dt className="rg-eyebrow">archetipi</dt>
          <dd className="rg-display tnum mt-1 text-[20px] leading-tight">{archetypes.length}</dd>
        </div>
      </dl>

      <div className="mt-8">
        <ArchetypeBars
          countLabel="giocatori"
          rows={archetypes.map((a) => {
            const won = a.best_rank === 1;
            return {
              id: a.archetype_id,
              name: a.name,
              colors: a.colors,
              count: a.players,
              hot: won,
              said: `${a.name}${won ? ", il mazzo vincente" : ""}: ${plural(a.players, "giocatore", "giocatori")}`,
            };
          })}
        />
      </div>
    </Section>
  );
}
