/**
 * The site's easter eggs: a few players whose name does something on their
 * own page and, softly, in the standings. Set here by hand, not from the
 * back office: this list is the record of who has what (the team page shows
 * it, read only).
 */
export type Effect = "fulmini" | "nebbia" | "pesca" | "copione" | "fumetto" | "orsetti" | "peek" | "napoletano" | "infezione" | "ventaglio" | "cintura" | "aragosta" | "maglietta" | "ratteo" | "birra" | "dinosauro";

/** What each effect looks like, for the list. "fulmini" is kept for whoever gets it next: nobody has it now. */
export const EFFECT_LABELS: Record<Effect, string> = {
  fulmini: "Scarica elettrica intorno al nome",
  nebbia: "Nebbia che passa davanti e dietro il nome",
  pesca: "Pesche attaccate al nome come sticker",
  copione: "Chat a raffica dietro la card, sulla Ruby Storm",
  fumetto: "Nuvolette da fumetto con le sue frasi",
  orsetti: "Pioggia di orsetti gommosi dietro e davanti alla card",
  peek: "Fa capolino a turno dai quattro lati della card",
  napoletano: "Tutta la sua pagina scritta in napoletano",
  infezione: "Radici radioattive che partono dal nome e si mangiano la card",
  ventaglio: "Una mano di Great Furnace e Goblin Tomb Raider a ventaglio nella card",
  cintura: "La cintura da campione del Paupergeddon Pisa 2024, che piomba sulla card",
  aragosta: "Un'aragosta gigante sul lato destro della card",
  maglietta: "La card tirata da un angolo come la sua maglietta",
  ratteo: "Iniziali di nome e cognome scambiate, e un topo: Ratteo",
  birra: "La card che si riempie di birra, come iBeer",
  dinosauro: "Un dinosauro attraversa la card: orme, scosse di terremoto e crepe",
};

export const EASTER_EGGS: { playerId: number; name: string; effect: Effect }[] = [
  { playerId: 1, name: "Lodovico De Jaegher", effect: "copione" },
  { playerId: 6, name: "Davide Rapacciuolo", effect: "napoletano" },
  { playerId: 9, name: "Nicolò Morselli", effect: "dinosauro" },
  { playerId: 13, name: "Demetrio Morselli", effect: "infezione" },
  { playerId: 15, name: "Filippo Pezza", effect: "cintura" },
  { playerId: 20, name: "Tommaso Cavallini", effect: "ventaglio" },
  { playerId: 28, name: "Arturo Precioso", effect: "pesca" },
  { playerId: 35, name: "Matteo Conte", effect: "fumetto" },
  { playerId: 37, name: "Stefano D'Antonio", effect: "peek" },
  { playerId: 38, name: "Lisa Coronini", effect: "aragosta" },
  { playerId: 45, name: "Andrea Forti", effect: "orsetti" },
  { playerId: 61, name: "Matteo Riccardi", effect: "ratteo" },
  { playerId: 87, name: "Matteo Strazzera", effect: "nebbia" },
  { playerId: 102, name: "Edoardo Mantovani", effect: "maglietta" },
  { playerId: 132, name: "Alessandro Saponara", effect: "birra" },
];

export const effectOf = (playerId: number | string): Effect | undefined =>
  EASTER_EGGS.find((e) => e.playerId === Number(playerId))?.effect;

