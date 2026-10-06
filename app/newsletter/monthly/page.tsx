import type { Metadata } from "next";
import VoteThanks from "../vote-thanks";

export const metadata: Metadata = {
  title: "Thanks for your response | Elikonas",
  robots: { index: false, follow: false },
};

export default function MonthlyVotePage() {
  return <VoteThanks choice="monthly" />;
}
