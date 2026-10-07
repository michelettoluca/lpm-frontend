"use client";

import { THEME_KEY } from "@/app/lib/theme";

/**
 * Switches the public site between light and dark. Both icons are rendered and
 * the stylesheet shows the right one, so the server markup never depends on
 * the visitor's choice. Switching back to what the system shows forgets the
 * choice: the site follows the system again.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const system = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const next = (root.dataset.theme ?? system) === "dark" ? "light" : "dark";
    try {
      if (next === system) localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, next);
    } catch {
      // Private mode or blocked storage: the switch still works for this visit.
    }
    if (next === system) delete root.dataset.theme;
    else root.dataset.theme = next;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`rg-theme inline-flex min-h-11 items-center rounded-full px-3 text-[14px] font-semibold ${className}`}
    >
      {/* Shown on the dark theme, to switch to light. */}
      <span className="rg-theme-sun items-center gap-2">
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6" />
        </svg>
        tema chiaro
      </span>
      {/* Shown on the light theme, to switch to dark. */}
      <span className="rg-theme-moon items-center gap-2">
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 14.6A8.2 8.2 0 0 1 9.4 4a8.2 8.2 0 1 0 10.6 10.6Z" />
        </svg>
        tema scuro
      </span>
    </button>
  );
}
