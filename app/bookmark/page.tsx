// Same purpose as app/postcard/page.tsx — a distinct real route so bookmark
// scans show up separately from postcard scans in Cloudflare's Top Paths.
// Put this exact URL (elikonas.com/bookmark) into the bookmark QR code.
import type { Metadata } from "next";
import { HomepageContent } from "@/app/components/homepage-content";

export const metadata: Metadata = {
  title: "Elikonas — Your learning, your record, your path",
  description:
    "A portable, learner-owned record for the skills you've built — in class, on the job, and everywhere in between.",
};

export default function BookmarkLanding() {
  return <HomepageContent />;
}
