import type { Metadata } from "next";
import { HomepageContent } from "@/app/components/homepage-content";

const TITLE = "Elikonas — AI-Guided Learning & Portable Credentials";
const DESCRIPTION =
  "A portable, learner-owned record for the skills you've built — in class, on the job, and everywhere in between. Guided by AI, owned by you.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // Absolute, trailing-slash URLs to exactly match sitemap.xml and the old
  // site's canonical/og:url convention, rather than relying on how Next
  // resolves a relative "/" against metadataBase (which drops the slash).
  alternates: { canonical: "https://elikonas.com/" },
  openGraph: {
    type: "website",
    title: TITLE,
    description: DESCRIPTION,
    url: "https://elikonas.com/",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function Home() {
  return <HomepageContent />;
}
