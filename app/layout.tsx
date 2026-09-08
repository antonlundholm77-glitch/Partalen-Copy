import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Comfortaa, Frank_Ruhl_Libre } from "next/font/google";
import "./globals.css";

// Variabla typsnitt — ingen `weight` (kraschar bygget för variabla fonter);
// vikt sätts via CSS i komponenten. Variablerna konsumeras i styles/tokens.css.
const comfortaa = Comfortaa({ subsets: ["latin"], variable: "--font-comfortaa", display: "swap" });
const frank = Frank_Ruhl_Libre({ subsets: ["latin"], variable: "--font-frank", display: "swap" });

export const metadata: Metadata = {
  title: "Part Plattform",
  description: "Part Plattform — projekt, moduler och AMA-data per bolag.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="sv"
      className={`${GeistSans.variable} ${GeistMono.variable} ${comfortaa.variable} ${frank.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-bg text-ink font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
