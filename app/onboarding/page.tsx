import type { Metadata } from "next";
import { OnboardingFlow } from "./onboarding-flow";

export const metadata: Metadata = {
  title: "Get started — Elikonas",
};

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#084c61]/5 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src="/images/logo-color.svg" alt="Elikonas" className="mx-auto h-10 w-auto" />
          <h1 className="mt-6 text-2xl font-semibold text-[#323031]">Let&apos;s get you started</h1>
          <p className="mt-2 text-sm text-[#323031]/50">
            A couple of quick questions so we can personalise your experience.
          </p>
        </div>

        <OnboardingFlow />
      </div>
    </div>
  );
}
