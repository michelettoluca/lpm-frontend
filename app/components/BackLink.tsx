import Link from "next/link";

export default function BackLink() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-1.5 text-[0.78rem] font-semibold text-ink-light transition-colors duration-150 hover:text-red-accent"
    >
      <span aria-hidden>←</span> Home
    </Link>
  );
}
