import { notFound } from "next/navigation";

/**
 * Any address no other page answers: the site's own 404, inside the header
 * and footer, instead of Next's bare English one.
 */
export default function Resto() {
  notFound();
}
