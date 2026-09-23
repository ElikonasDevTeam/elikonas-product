import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://elikonas.com";
const DEFAULT_DESCRIPTION =
  "Elikonas is a learner-owned educational record platform for non-traditional learners — a portable, lifelong record of everything you've learned, guided by AI.";
const OG_IMAGE = "/assets/images/OG_logo_blu-ylw_tagline-ylw_bkgrnd-teal.png";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Elikonas — AI-Guided Learning & Portable Credentials",
  description: DEFAULT_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Elikonas",
    title: "Elikonas — AI-Guided Learning & Portable Credentials",
    description: DEFAULT_DESCRIPTION,
    url: `${SITE_URL}/`,
    images: [{ url: OG_IMAGE }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Elikonas — AI-Guided Learning & Portable Credentials",
    description: DEFAULT_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

// Kept in sync by hand with the `organization` block in public/seo-pages.json,
// which drives the equivalent JSON-LD the static marketing pages used to get
// from public/index.html before the app/site merge (see rebuild_shared_content.py).
// That script never re-adds this block here because index.html no longer
// exists in this repo — app/page.tsx is the real homepage now.
const ORGANIZATION_JSONLD = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "Elikonas",
  legalName: "Elikonas Public Benefit Corporation",
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/assets/images/Elikonas_logo_blu-ylw.svg`,
  description: DEFAULT_DESCRIPTION,
  sameAs: [
    "https://x.com/elikonasmuse",
    "https://www.facebook.com/elikonasmuse",
    "https://www.linkedin.com/company/elikonas",
    "https://youtube.com/@elikonasmuse",
    "https://www.instagram.com/elikonasmuse",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSONLD) }}
        />
        {children}
        {/* Cloudflare Web Analytics */}
        <Script
          strategy="afterInteractive"
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "76df83795f784f91a1adf20acb38a393"}'
        />
      </body>
    </html>
  );
}
