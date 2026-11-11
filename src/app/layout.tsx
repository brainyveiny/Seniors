import type { Metadata } from "next";
import { DM_Sans, Geist, Geist_Mono } from "next/font/google";
import { SITE_URL, defaultRootMetadata } from "@/shared/lib/seo-metadata";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

/** Rarely on critical path -keep available without blocking first paint */
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

/** Admin shell typeface -not needed for public LCP */
const ttNorms = DM_Sans({
  variable: "--font-tt-norms",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  ...defaultRootMetadata,
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Seniors | School-Specific Personalized Learning",
    template: "%s | Seniors",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${ttNorms.variable} min-h-full antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
