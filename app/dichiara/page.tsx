import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_TEXT } from "../components/ui";
import { Toaster } from "sonner";
import { DeclareFlow } from "./DeclareFlow";

export const metadata: Metadata = {
  title: "Dichiara il mazzo · Lega Pauper Milano",
  description: "Dichiara il mazzo che giochi alla tappa di oggi.",
  robots: { index: false, follow: false },
};

export default function DeclarePage() {
  return (
    <main className="mx-auto w-full max-w-[520px] px-5 pt-5 pb-12">
      <Link href="/" className={`${BRAND_TEXT} rounded-sm transition-colors hover:text-accent`}>
        LPM ✦ Lega Pauper Milano
      </Link>
      <div className="mt-6">
        <DeclareFlow />
      </div>
      <Toaster
        position="top-center"
        richColors
        closeButton
        toastOptions={{ style: { fontFamily: "var(--font-archivo), system-ui, sans-serif", borderRadius: 12 } }}
      />
    </main>
  );
}
