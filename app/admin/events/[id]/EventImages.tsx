"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { AdminError } from "@/app/lib/adminTypes";
import type { ShareImage } from "@/app/api/admin/events/[id]/immagini/kinds";
import { useAdmin } from "../../AdminShell";
import { ErrorPanel } from "../../ErrorPanel";
import { BUTTON, BUTTON_PRIMARY, EmptyState, SectionHeader } from "../../dashboardUi";

/** Whether this browser can hand a PNG to the share sheet; never on the server, so the first paint says no. */
function canShareFiles() {
  try {
    return navigator.canShare?.({ files: [new File([""], "lpm.png", { type: "image/png" })] }) ?? false;
  } catch {
    return false;
  }
}
const never = () => () => {};

const LABELS: Record<ShareImage["kind"], string> = {
  classifica: "Classifica finale",
  mazzi: "Metagame",
  imbattuti: "Imbattuti",
};

/**
 * The tappa's images for WhatsApp, drawn by the server from the results:
 * the classifica, the decks played, and whoever closed without a loss. On a
 * phone the button opens the share sheet with the PNG attached; elsewhere it
 * saves the file.
 */
export function EventImages({ eventId }: { eventId: number }) {
  const { call } = useAdmin();
  const [images, setImages] = useState<ShareImage[] | null>(null);
  const [error, setError] = useState<AdminError | null>(null);
  const canShare = useSyncExternalStore(never, canShareFiles, () => false);

  useEffect(() => {
    let live = true;
    void call<ShareImage[]>(`/api/admin/events/${eventId}/immagini`).then((res) => {
      if (!live) return;
      if (res.ok) setImages(res.data);
      else setError(res.error);
    });
    return () => {
      live = false;
    };
  }, [call, eventId]);

  return (
    <section>
      <SectionHeader title="Immagini per WhatsApp" aside={images ? `${images.length} pronte` : undefined} />
      <p className="mb-4 max-w-xl text-[13px] leading-relaxed text-ink/55">
        Disegnate dai risultati e dai mazzi qui sopra: se correggi un mazzo, ricarica la pagina e l&apos;immagine si aggiorna.
        Dal telefono il pulsante apre la condivisione con l&apos;immagine già allegata; dal computer la scarica.
      </p>
      {error && (
        <div className="mb-4">
          <ErrorPanel error={error} />
        </div>
      )}
      {images && images.length === 0 && (
        <div className="card">
          <EmptyState>Nessuna immagine: la tappa non ha ancora risultati.</EmptyState>
        </div>
      )}
      {images && images.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => (
            <Card key={img.kind} img={img} canShare={canShare} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Card({ img, canShare }: { img: ShareImage; canShare: boolean }) {
  const [state, setState] = useState<"idle" | "busy" | "failed">("idle");

  async function share() {
    setState("busy");
    try {
      const res = await fetch(img.href);
      if (!res.ok) throw new Error(`GET ${img.href} failed: ${res.status}`);
      const file = new File([await res.blob()], img.file, { type: "image/png" });
      await navigator.share({ files: [file], title: img.title });
      setState("idle");
    } catch (err) {
      // Closing the share sheet is not a failure.
      setState(err instanceof DOMException && err.name === "AbortError" ? "idle" : "failed");
    }
  }

  return (
    <li className="card flex min-w-0 flex-col">
      <a href={img.href} target="_blank" rel="noreferrer" className="block bg-canvas p-2">
        {/* The PNG is drawn on request and its height depends on the tappa: not one for next/image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.href} alt={img.title} loading="lazy" className="block h-auto w-full rounded-lg border border-ink/8" />
      </a>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="text-[13px] font-semibold">{LABELS[img.kind]}</span>
        {canShare ? (
          <button type="button" onClick={share} disabled={state === "busy"} className={BUTTON_PRIMARY}>
            {state === "busy" ? "Un attimo…" : "Condividi"}
          </button>
        ) : (
          <a href={img.href} download={img.file} className={BUTTON}>
            Scarica
          </a>
        )}
      </div>
      {state === "failed" && (
        <p className="px-4 pb-3 text-[12px] leading-snug text-ink/55">
          La condivisione non si è aperta:{" "}
          <a href={img.href} download={img.file} className="text-accent underline-offset-2 hover:underline">
            scarica l&apos;immagine
          </a>{" "}
          e inviala da WhatsApp.
        </p>
      )}
    </li>
  );
}
