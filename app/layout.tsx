import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { getLatestSeason } from "./lib/api";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const BASE_URL = "https://legapaupermilano.it";
const NAME = "Lega Pauper Milano";
const TITLE = `${NAME} (LPM)`;

export async function generateMetadata(): Promise<Metadata> {
  const season = await getLatestSeason();
  const description = season ? `${NAME} · ${season.name}` : NAME;

  return {
    metadataBase: new URL(BASE_URL),
    title: TITLE,
    description,
    keywords: [
      "Lega Pauper Milano",
      "LPM",
      "Pauper Milano",
      "Lega Pauper",
      "MTG Pauper Milano",
      "Magic the Gathering Pauper",
    ],
    openGraph: {
      title: TITLE,
      description,
      siteName: NAME,
      url: BASE_URL,
      locale: "it_IT",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: TITLE,
      description,
    },
    verification: {
      google: "b6GurfUaQuG9JQi-remizUCQOpN4SjYNFyU8_RtG3-o",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    name: NAME,
    alternateName: "LPM",
    url: BASE_URL,
    sport: "Magic: The Gathering (Pauper)",
    areaServed: {
      "@type": "City",
      name: "Milano",
    },
  };

  return (
    <html lang="it" className={`${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
