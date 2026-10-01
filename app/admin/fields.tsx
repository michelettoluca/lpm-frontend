"use client";

import type { ReactNode } from "react";

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="lbl block">
        {label}
      </label>
      {hint && (
        <p className="mt-1 text-[12px] leading-[1.4] text-ink/50">{hint}</p>
      )}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export const CONTROL =
  "h-9 w-full rounded-md border border-ink/15 bg-surface px-2.5 text-[16px] outline-none placeholder:text-[13px] sm:text-[13px] transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:opacity-60";

export const CONTROL_INVALID = "border-accent";

/** CONTROL for a `<textarea>`: grows with its rows instead of one line high. */
export const TEXTAREA =
  "w-full rounded-md border border-ink/15 bg-surface px-2.5 py-2 text-[16px] leading-[1.45] outline-none placeholder:text-[13px] sm:text-[13px] transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:opacity-60";

/** Non-blocking heads-up, e.g. the two CSVs look swapped. */
export function Warning({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1.5 text-[12px] font-semibold leading-[1.4] text-accent">
      {children}
    </p>
  );
}
