/**
 * The teams in the league, apart from the players' own easter eggs: a team's
 * logo shows on its players' pages as a watermark, like the league's emblem
 * on the home. For now set here, by player id; later from the back office,
 * with the easter eggs.
 */
import type { ComponentType } from "react";

/** Diego's team's logo: two bolts side by side, traced from its picture, in a 338 by 580 box. Drawn in the current colour. */
const BOLTS_PATH =
  "M39 34 41 35 41 44 22 208 34 212 72 216 76 217 77 220 41 317 40 327 45 328 87 317 91 317 93 323 73 513 71 513 73 343 66 342 13 354 9 354 7 351 47 241 47 236 44 234 6 231 0 227ZM26 0 229 30 227 36 200 57 164 90 236 106 238 110 157 211 94 247 92 247 94 242 169 142 176 132 176 128 91 113 91 108 147 60 151 53ZM332 204 338 204 336 207 188 254 178 259 157 343 158 346 279 325 286 325 286 327 150 392 68 580 143 271 143 268 97 268 97 266 163 226Z";

export const BoltsLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 338 580" aria-hidden="true" className={className}>
    <path fill="currentColor" d={BOLTS_PATH} />
  </svg>
);

export type Team = { logo: ComponentType<{ className?: string }>; players: number[] };

const TEAMS: Team[] = [
  { logo: BoltsLogo, players: [21] }, // Diego Lacedonia's team
];

export const teamOf = (playerId: number | string): Team | undefined =>
  TEAMS.find((t) => t.players.includes(Number(playerId)));
