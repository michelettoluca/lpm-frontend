import Link from "next/link";

type Props = {
  href: string;
  label: string;
};

/** "← Label" link to a named destination, independent of browser history. */
export default function BackLink({ href, label }: Props) {
  return (
    <Link
      href={href}
      className="text-[13px] font-bold transition-colors hover:text-accent"
    >
      <span aria-hidden>←</span> {label}
    </Link>
  );
}
