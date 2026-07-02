import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { Brand } from "@/components/layout/brand";
import { isClerkEnabled } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Agent Market.",
};

export default function SignInPage() {
  // Keyless environments run as the demo operator — there is nothing to sign
  // in to, so send visitors back to the product.
  if (!isClerkEnabled()) redirect("/");

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-grid bg-grid-fade" aria-hidden />
      <div className="relative flex flex-col items-center gap-8">
        <Link
          href="/"
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Brand />
        </Link>
        <SignIn />
      </div>
    </div>
  );
}
