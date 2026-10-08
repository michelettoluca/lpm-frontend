import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { AdminShell } from "./AdminShell";

/* The public site's text face, so the admin reads like the same house. */
const text = Figtree({
  variable: "--font-rg-text",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Admin · Lega Pauper Milano",
  robots: { index: false, follow: false },
};
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${text.variable} contents`}>
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
