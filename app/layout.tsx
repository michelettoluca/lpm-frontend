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

const TITLE = "Lega Pauper Milano";

export async function generateMetadata(): Promise<Metadata> {
  const season = await getLatestSeason();
  const description = season ? `${TITLE} · ${season.name}` : TITLE;

  return {
    title: TITLE,
    description,
    openGraph: {
      title: TITLE,
      description,
      siteName: TITLE,
      locale: "it_IT",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: TITLE,
      description,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
