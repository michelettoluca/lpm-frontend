import type { Metadata } from "next";
import BackLink from "../components/BackLink";
import { Brand, PAGE, NARROW, TopBar } from "../components/ui";
import { adminKeyConfigured, listSeasons } from "../lib/adminApi";
import type { Season } from "../lib/adminTypes";
import { DangerZone } from "./DangerZone";
import { ImportForm } from "./ImportForm";

export const metadata: Metadata = {
  title: "Admin · Lega Pauper Milano",
  robots: { index: false, follow: false },
};

// Seasons change as soon as an import runs, so never serve this page from cache.
export const dynamic = "force-dynamic";

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 rounded-[18px] border-[1.5px] border-accent bg-tint p-4">
      <div className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-accent">
        {title}
      </div>
      <p className="mt-2 text-[13px] leading-[1.5] text-ink/80">{children}</p>
    </div>
  );
}

export default async function AdminPage() {
  let seasons: Season[] = [];
  let seasonsFailed = false;
  try {
    seasons = await listSeasons();
  } catch {
    seasonsFailed = true;
  }

  return (
    <main className={PAGE}>
      <div className={NARROW}>
        <TopBar
          className="lg:mb-7"
          left={<BackLink href="/" label="Home" />}
          right={<Brand year={new Date().getFullYear()} />}
        />

        <h1 className="mt-4 mb-6 text-[30px] font-extrabold leading-[0.95] tracking-[-0.03em] lg:text-[40px]">
          Import
          <span className="block text-accent">tornei</span>
        </h1>

        {!adminKeyConfigured() && (
          <Notice title="Chiave admin non configurata">
            Questo server web non ha una <code>ADMIN_API_KEY</code>
            nell&apos;ambiente, quindi import e reset falliranno. Impostala e
            riavvia il server.
          </Notice>
        )}

        {seasonsFailed && (
          <Notice title="Stagioni non caricate">
            Non è stato possibile leggere l&apos;elenco delle stagioni
            dall&apos;API. Ricarica la pagina: senza stagione non si può
            importare.
          </Notice>
        )}

        <ImportForm initialSeasons={seasons} />
        <DangerZone />
      </div>
    </main>
  );
}
