/**
 * The site's easter eggs: a few players whose name does something on their
 * own page. For now set here, by player id; later from the back office, for
 * the super admins only.
 */
export type Effect = "fulmini" | "nebbia" | "pesca" | "copione";

const EFFECTS: Record<number, Effect> = {
  1: "copione", // Lodovico De Jaegher
  21: "fulmini", // Diego Lacedonia
  28: "pesca", // Arturo Precioso
  87: "nebbia", // Matteo Strazzera
};

export const effectOf = (playerId: number | string): Effect | undefined => EFFECTS[Number(playerId)];
