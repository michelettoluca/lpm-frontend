/**
 * The site's easter eggs: a few players whose name does something on their
 * own page. For now set here, by player id; later from the back office, for
 * the super admins only.
 */
/** The effects there are. "fulmini", a charge crackling round the name, is kept for whoever gets it next: nobody has it now. */
export type Effect = "fulmini" | "nebbia" | "pesca" | "copione";

const EFFECTS: Record<number, Effect> = {
  1: "copione", // Lodovico De Jaegher
  28: "pesca", // Arturo Precioso
  87: "nebbia", // Matteo Strazzera
};

export const effectOf = (playerId: number | string): Effect | undefined => EFFECTS[Number(playerId)];
