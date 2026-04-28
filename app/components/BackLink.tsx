"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";

const PATH_LABELS: { pattern: RegExp; label: string }[] = [
  { pattern: /^\/$/, label: "Home" },
  { pattern: /^\/leaderboard/, label: "Classifica" },
  { pattern: /^\/events\/[^/]+/, label: "Tappa" },
  { pattern: /^\/players\/[^/]+/, label: "Giocatore" },
];

function labelFor(pathname: string): string {
  for (const { pattern, label } of PATH_LABELS) {
    if (pattern.test(pathname)) return label;
  }
  return "Indietro";
}

export default function BackLink() {
  const router = useRouter();
  const [label, setLabel] = useState("Home");
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    const ref = document.referrer;
    if (!ref) return;
    try {
      const url = new URL(ref);
      if (
        url.origin === window.location.origin &&
        url.pathname !== window.location.pathname
      ) {
        setLabel(labelFor(url.pathname));
        setCanGoBack(true);
      }
    } catch {
      // ignore malformed referrer
    }
  }, []);

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (canGoBack) {
      e.preventDefault();
      router.back();
    }
  };

  return (
    <a
      href="/"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[0.78rem] font-semibold text-ink-light transition-colors duration-150 hover:text-red-accent"
    >
      <span aria-hidden>←</span> {label}
    </a>
  );
}
