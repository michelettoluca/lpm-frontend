import Link from "next/link";
import type { H2HOpponent } from "../../lib/api";
import { EmptyRow } from "../../components/ui";

type Row = {
  id: number;
  name: string;
  matches: number;
  won: number;
  lost: number;
  drawn: number;
};

export function summarize(opponents: H2HOpponent[]): Row[] {
  return opponents
    .map((o) => {
      const r = { won: 0, lost: 0, drawn: 0 };
      for (const m of o.matches) {
        if (m.wins > m.losses) r.won += 1;
        else if (m.losses > m.wins) r.lost += 1;
        else r.drawn += 1;
      }
      return {
        id: o.opponent_id,
        name: o.opponent_name,
        matches: o.matches.length,
        ...r,
      };
    })
    .sort((a, b) => b.matches - a.matches || a.name.localeCompare(b.name));
}

export default function HeadToHead({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <div className="card">
        <EmptyRow>Nessun match registrato.</EmptyRow>
      </div>
    );
  }
  return (
    <div className="card">
      <ul>
        {rows.map((o) => {
          const color =
            o.won > o.lost
              ? "text-accent"
              : o.won < o.lost
                ? "text-ink/50"
                : "text-ink";
          return (
            <li key={o.id} className="border-b border-ink/8 last:border-b-0">
              <Link
                href={`/players/${o.id}`}
                className="row-link grid grid-cols-[1fr_auto] items-center gap-2.5 px-4 py-[11px] lg:px-5 lg:py-[13px]"
              >
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-bold capitalize leading-[1.2] lg:text-[15px]">
                    {o.name}
                  </div>
                  <div className="mt-px text-[12px] text-ink/50">
                    {o.matches} {o.matches === 1 ? "partita" : "partite"}
                  </div>
                </div>
                <span
                  className={`tn text-[16px] font-extrabold tracking-[-0.02em] lg:text-[18px] ${color}`}
                >
                  {o.won}-{o.lost}-{o.drawn}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
