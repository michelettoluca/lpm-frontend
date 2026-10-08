"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdmin } from "../AdminShell";

const SECTIONS = [
  { href: "/admin/seasons", label: "Stagioni" },
  { href: "/admin/lpi", label: "Archetipi" },
  { href: "/admin/admins", label: "Amministratori", superOnly: true },
  { href: "/admin/advanced", label: "Avanzate" },
];

/**
 * Impostazioni: what changes a few times a year, apart from the evening's
 * work. One title, the sections as tabs, each section's page below.
 */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { me } = useAdmin();
  const path = usePathname();
  return (
    <>
      <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.01em]">Impostazioni</h1>
      <nav aria-label="Sezioni delle impostazioni" className="mt-5 mb-8 flex gap-1 overflow-x-auto border-b border-ink/10">
        {SECTIONS.filter((s) => !s.superOnly || me.is_super).map((s) => {
          const active = path.startsWith(s.href);
          return (
            <Link
              key={s.href}
              href={s.href}
              aria-current={active ? "page" : undefined}
              className={`-mb-px flex h-11 shrink-0 items-center border-b-2 px-3 text-[16px] transition-colors ${
                active ? "border-accent font-semibold text-ink" : "border-transparent text-ink/55 hover:text-ink"
              }`}
            >
              {s.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </>
  );
}
