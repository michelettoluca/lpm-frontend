/**
 * The site's easter eggs: a few players whose name does something on their
 * own page and, softly, in the standings. Set here by hand, not from the
 * back office: this list is the record of who has what (the team page shows
 * it, read only).
 */
export type Effect = "fulmini" | "nebbia" | "pesca" | "copione" | "fumetto" | "orsetti" | "peek";

/** What each effect looks like, for the list. "fulmini" is kept for whoever gets it next: nobody has it now. */
export const EFFECT_LABELS: Record<Effect, string> = {
  fulmini: "Scarica elettrica intorno al nome",
  nebbia: "Nebbia che passa davanti e dietro il nome",
  pesca: "Pesche attaccate al nome come sticker",
  copione: "Chat a raffica dietro la card, sulla Ruby Storm",
  fumetto: "Nuvolette da fumetto con le sue frasi",
  orsetti: "Pioggia di orsetti gommosi dietro e davanti alla card",
  peek: "Fa capolino a turno dai quattro lati della card",
};

export const EASTER_EGGS: { playerId: number; name: string; effect: Effect }[] = [
  { playerId: 1, name: "Lodovico De Jaegher", effect: "copione" },
  { playerId: 28, name: "Arturo Precioso", effect: "pesca" },
  { playerId: 35, name: "Matteo Conte", effect: "fumetto" },
  { playerId: 37, name: "Stefano D'Antonio", effect: "peek" },
  { playerId: 45, name: "Andrea Forti", effect: "orsetti" },
  { playerId: 87, name: "Matteo Strazzera", effect: "nebbia" },
];

export const effectOf = (playerId: number | string): Effect | undefined =>
  EASTER_EGGS.find((e) => e.playerId === Number(playerId))?.effect;

