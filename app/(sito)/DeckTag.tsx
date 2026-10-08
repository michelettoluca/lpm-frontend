import type { Deck } from "@/app/lib/site";
import { archetypeLabel } from "@/app/lib/decks";
import { Mana } from "./ui";

/** The deck a player brought: its colours and its name, small, beside their result. */
export function DeckTag({ deck, className = "" }: { deck: Deck; className?: string }) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${className}`}>
      <Mana colors={deck.colors} size={13} />
      <span className="truncate">{archetypeLabel(deck.name)}</span>
    </span>
  );
}
