import type { Metagame as Data, MetagameArchetype } from "@/app/lib/site";
import { Mana, Section, plural } from "../../ui";

const MANA: { c: string; name: string }[] = [
  { c: "W", name: "bianco" },
  { c: "U", name: "blu" },
  { c: "B", name: "nero" },
  { c: "R", name: "rosso" },
  { c: "G", name: "verde" },
];

/** On phones the name takes its own line above the numbers; from sm up it is the first column. */
const COLS = "grid-cols-[1fr_1.5rem_3.2rem_4.8rem] gap-x-2 sm:grid-cols-[minmax(0,15rem)_1fr_1.5rem_3.5rem_6rem] sm:gap-x-3";

/** Byes count as wins, as in the standings. */
const rec = (a: MetagameArchetype) => `${a.wins + (a.byes ?? 0)}-${a.losses}-${a.draws}`;
const pct = (n: number, of: number) => `${Math.round((n / of) * 100)}%`;

/** A thin bar from the left edge, its length the share of the longest. */
function Bar({ value, max, hot = false }: { value: number; max: number; hot?: boolean }) {
  return (
    <span aria-hidden="true" className="block h-2 min-w-0">
      <span
        className="block h-full rounded-r-[4px]"
        style={{ width: `${Math.max((value / max) * 100, 2)}%`, background: hot ? "var(--rg-o)" : "var(--rg-ink)" }}
      />
    </span>
  );
}

function ArchetypeRow({ a, max, first }: { a: MetagameArchetype; max: number; first: boolean }) {
  const won = a.best_rank === 1;
  const said = `${a.name}${won ? ", il mazzo vincente" : ""}: ${plural(a.players, "giocatore", "giocatori")}, record ${rec(a)}, miglior punteggio ${plural(a.best_points, "punto", "punti")}`;
  return (
    <li className={first ? "" : "rg-hr"}>
      <div className={`rg-row -mx-2 grid items-center gap-y-1 px-2 py-2 ${COLS}`} title={said}>
        <span className="sr-only">{said}</span>
        <span aria-hidden="true" className="col-span-4 flex min-w-0 items-center gap-1.5 text-[15px] font-semibold sm:col-span-1">
          <span className={`truncate ${won ? "text-[var(--rg-link)]" : ""}`}>{a.name}</span>
          <Mana colors={a.colors} size={14} />
        </span>
        <Bar value={a.players} max={max} hot={won} />
        <span aria-hidden="true" className="rg-display rg-strong tnum text-right text-[16px] leading-none">
          {a.players}
        </span>
        <span aria-hidden="true" className="rg-muted tnum text-right text-[13px]">
          {rec(a)}
        </span>
        <span aria-hidden="true" className={`tnum text-right text-[13px] font-semibold ${won ? "text-[var(--rg-link)]" : ""}`}>
          {a.best_points}
        </span>
      </div>
    </li>
  );
}

/** The tappa's decks: what was played most, what won, and the colours on the tables. */
export function Metagame({ data }: { data: Data }) {
  const { archetypes, declared } = data;
  const max = archetypes[0]?.players ?? 1;
  const top = archetypes[0];
  const tiedTop = archetypes.filter((a) => a.players === top.players);
  const winner = archetypes.find((a) => a.best_rank === 1);

  const colors = MANA.map((m) => ({
    ...m,
    count: archetypes.filter((a) => a.colors.includes(m.c)).reduce((s, a) => s + a.players, 0),
  }));
  const maxColor = Math.max(1, ...colors.map((c) => c.count));

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

      <div aria-hidden="true" className={`rg-colheads mt-8 grid items-end ${COLS}`}>
        <span className="hidden sm:block">archetipo</span>
        <span className="col-span-2">giocatori</span>
        <span className="text-right">v-p-p</span>
        <span className="text-right">miglior punteggio</span>
      </div>
      <ol>
        {archetypes.map((a, i) => (
          <ArchetypeRow key={a.archetype_id} a={a} max={max} first={i === 0} />
        ))}
      </ol>

      <h3 className="rg-eyebrow mt-8">distribuzione colori</h3>
      <ul className="mt-3 grid grid-cols-5 gap-3 sm:gap-5">
        {colors.map((m) => {
          const said = `${m.name}: ${plural(m.count, "mazzo", "mazzi")} su ${declared}, ${pct(m.count, declared)}`;
          return (
            <li key={m.c} title={said} className="min-w-0">
              <span className="sr-only">{said}</span>
              <span aria-hidden="true" className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-1.5">
                <Mana colors={[m.c]} size={18} />
                <span className="rg-strong tnum text-[14px]">{pct(m.count, declared)}</span>
              </span>
              <span aria-hidden="true" className="mt-2 block">
                <Bar value={m.count} max={maxColor} />
              </span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
