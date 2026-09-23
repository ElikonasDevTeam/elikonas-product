// Distinct real route so it shows up separately in Cloudflare Web Analytics'
// "Top Paths" report — Cloudflare does not log query strings, so a shared
// "/" with ?utm_source=postcard would be invisible there. Put this exact
// URL (elikonas.com/postcards) into the postcard QR code.
import type { Metadata } from "next";
import { HomepageContent } from "@/app/components/homepage-content";

export const metadata: Metadata = {
  title: "Elikonas — Your learning, your record, your path",
  description:
    "A portable, learner-owned record for the skills you've built — in class, on the job, and everywhere in between.",
  // Same content as "/" — canonicalize so search engines don't treat this
  // QR-tracking landing page as duplicate content.
  alternates: { canonical: "https://elikonas.com/" },
};

export default function PostcardLanding() {
  return <HomepageContent />;
}
