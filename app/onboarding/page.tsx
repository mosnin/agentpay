import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/layout/brand";
import { requireUser } from "@/lib/auth";
import { getOrganizations } from "@/lib/queries";
import { OnboardingWizard } from "./onboarding-wizard";

export const metadata: Metadata = {
  title: "Welcome",
  description: "A couple of quick questions before you get started.",
};

export default async function OnboardingPage() {
  const user = await requireUser();
  if (user.onboardedAt) redirect("/dashboard");

  const organizations = await getOrganizations();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade" aria-hidden />
      <div className="relative flex flex-col items-center gap-8">
        <Brand />
        <OnboardingWizard
          organizations={organizations.map((org) => ({ id: org.id, name: org.name }))}
        />
      </div>
    </div>
  );
}
