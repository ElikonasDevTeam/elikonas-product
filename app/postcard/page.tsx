// Distinct real route so it shows up separately in Cloudflare Web Analytics'
// "Top Paths" report — Cloudflare does not log query strings, so a shared
// "/" with ?utm_source=postcard would be invisible there. Put this exact
// URL (elikonas.com/postcard) into the postcard QR code.
import type { Metadata } from "next";
import { HomepageContent } from "@/app/components/homepage-content";

export const metadata: Metadata = {
  title: "Elikonas — Your learning, your record, your path",
  description:
    "A portable, learner-owned record for the skills you've built — in class, on the job, and everywhere in between.",
};

export default function PostcardLanding() {
  return <HomepageContent />;
}
