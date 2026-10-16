"use client";

import { useRef, type ReactNode } from "react";

/**
 * The matrix's scrolling, with its column names kept in sight. The table runs
 * sideways in its own scroller, so a sticky header inside it would stick to
 * that scroller, not to the page: the names are drawn once more above it, in a
 * strip that sticks to the top of the screen while the matrix is on it and
 * follows the table sideways. The strip is for the eye only; the table keeps
 * its own header for screen readers.
 *
 * Following is an animation driven by the table's scroll (sito.css), so the
 * browser moves both in the same frame. Where it can't, the strip is set from
 * the scroll event instead, a frame or so behind on a phone.
 */
export function MatrixScroll({ head, children }: { head: ReactNode; children: ReactNode }) {
  const strip = useRef<HTMLDivElement>(null);
  return (
    <div className="rg-mx-scope">
      {/* On phones the matrix runs to the panel's edges, the strip with it. */}
      <div
        aria-hidden="true"
        ref={strip}
        className="rg-mx-strip sticky top-0 z-30 -mx-5 overflow-hidden bg-[var(--rg-paper)] sm:mx-0"
      >
        <div className="rg-mx-follow">{head}</div>
      </div>
      {/* Scrolling stops on a whole column. Relative so the table's hidden header, placed
          absolutely, stays inside and is clipped with it: past the page's edge it would widen the
          page, and a phone then lays the page out wider and taller than the screen, which leaves
          nothing for the strip to stick to. */}
      <div
        className="rg-mx-scroller relative -mx-5 snap-x snap-proximity overflow-x-auto pb-2 sm:mx-0"
        onScroll={(event) => {
          if (strip.current && !CSS.supports("animation-timeline: scroll()")) {
            strip.current.scrollLeft = event.currentTarget.scrollLeft;
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
