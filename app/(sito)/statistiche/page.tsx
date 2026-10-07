import { getStatsData } from "@/app/lib/site";
import { Matrix } from "../Matrix";
import { SeasonPicker } from "../SeasonPicker";
import { Comune, Head } from "../ui";

export const metadata = { title: "Statistiche · Lega Pauper Milano" };

export default async function StatsPage(props: PageProps<"/statistiche">) {
  const { stagione } = await props.searchParams;
  const { choice, matrix } = await getStatsData(stagione);
  const season = choice.seasons.find((s) => s.id === choice.selected);
  const scope = season ? season.name : "tutte le stagioni";
  const of = season ? `della ${season.name}` : "di tutte le stagioni";

  return (
    <div className="rg-stack">
      {/* A full-width panel: the matrix needs the room more than the heading does. */}
      <section className="rg-panel">
        <Head
          as="h1"
          big
          label="statistiche"
          title="la matrice della lega"
          aside={`La matrice dei risultati ${of}, archetipo contro archetipo.`}
        />
        <div className="mt-6">
          <SeasonPicker choice={choice} href="/statistiche" />
        </div>
        <div className="mt-6">
          {matrix && matrix.cells.length > 0 ? (
            <Matrix
              rows={matrix.archetypes}
              columns={matrix.archetypes}
              cells={matrix.cells}
              mirror
              label={`Matrice dei matchup, ${scope}`}
            />
          ) : (
            <div className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
              <Comune pose="lost" className="h-[110px] w-[110px]" />
              <Head title="Ancora nessun matchup." aside="Compaiono quando ci sono tappe con i mazzi dei giocatori." />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
