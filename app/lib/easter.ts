/**
 * The site's easter eggs: a few players whose name does something when you
 * point at it. For now set here, by player id; later from the back office,
 * for the super admins only.
 */
export type Effect = "fulmini";

const EFFECTS: Record<number, Effect> = {
  21: "fulmini", // Diego Lacedonia
};

export const effectOf = (playerId: number | string): Effect | undefined => EFFECTS[Number(playerId)];
