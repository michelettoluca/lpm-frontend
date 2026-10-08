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
        <p className="mt-1 text-[13px] leading-[1.4] text-ink/50">{hint}</p>
      )}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export const CONTROL =
  "h-11 w-full rounded-lg border border-ink/15 bg-surface px-2.5 text-[16px] outline-none placeholder:text-[15px] sm:text-[15px] transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:opacity-60";

export const CONTROL_INVALID = "border-accent";

/** Non-blocking heads-up, e.g. the two CSVs look swapped. */
export function Warning({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1.5 text-[13px] font-semibold leading-[1.4] text-accent">
      {children}
    </p>
  );
}
