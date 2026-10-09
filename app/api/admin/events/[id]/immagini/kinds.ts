import type { EventData, Standing } from "@/app/lib/site";

/** The images a tappa can be shared as, one per kind. Admins only: the addresses sit under the proxy routes. */
export type ImageKind = "classifica" | "mazzi" | "imbattuti";

export type ShareImage = {
  kind: ImageKind;
  /** The PNG's address. */
  href: string;
  /** The file's name when saved or shared. */
  file: string;
  /** What the image shows, for the card and the share sheet. */
  title: string;
};

/** Who finished the night without losing a match: a draw does not count against them. */
export function undefeated<T extends Standing>(standings: T[]): T[] {
  return standings.filter((s) => s.losses === 0 && s.wins + s.draws + s.byes > 0);
}

/** The images this tappa has to share, in the order shown. */
export function shareImages(e: EventData): ShareImage[] {
  if (!e.hasResults) return [];
  const slug = `lpm-tappa-${e.number ?? e.event.id}`;
  const base = `/api/admin/events/${e.event.id}/immagini`;
  const image = (kind: ImageKind, title: string): ShareImage => ({
    kind,
    href: `${base}/${kind}`,
    file: `${slug}-${kind}.png`,
    title,
  });
  const list = [image("classifica", `${e.title}: la classifica finale`)];
  if (e.metagame) list.push(image("mazzi", `${e.title}: il metagame`));
  if (undefeated(e.standings).length > 0) list.push(image("imbattuti", `${e.title}: gli imbattuti`));
  return list;
}
