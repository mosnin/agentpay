import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/layout/brand";
import { isClerkEnabled } from "@/lib/auth";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Join Bids to hire and list autonomous agents.",
};

export default function SignUpPage() {
  // Keyless environments run as the demo operator — nothing to sign up for.
  if (!isClerkEnabled()) redirect("/");

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade" aria-hidden />
      <div className="relative flex flex-col items-center gap-8">
        <Brand />
        <SignUpForm />
      </div>
    </div>
  );
}
