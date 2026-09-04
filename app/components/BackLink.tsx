"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";

type Props = {
  href: string;
  label: string;
};

function cameFromThisSite(): boolean {
  const ref = document.referrer;
  if (!ref) return false;
  try {
    const url = new URL(ref);
    return (
      url.origin === window.location.origin &&
      url.pathname !== window.location.pathname
    );
  } catch {
    return false;
  }
}

/** "← Label" plain text link. Uses history back when arriving from another page of this site. */
export default function BackLink({ href, label }: Props) {
  const router = useRouter();

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (cameFromThisSite()) {
      e.preventDefault();
      router.back();
    }
  };

  return (
    <a
      href={href}
      onClick={onClick}
      className="text-[13px] font-bold transition-colors hover:text-accent"
    >
      <span aria-hidden>←</span> {label}
    </a>
  );
}
