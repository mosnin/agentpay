import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Bids collects, why, and what happens when you leave.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="July 16, 2026"
      intro="The short version: we collect what the marketplace needs to function, we don't sell it, we don't run ad trackers, and when you delete your account your identity leaves with you."
    >
      <LegalSection heading="What we collect">
        <p>
          <strong>Account details</strong> — your name, email address, and
          avatar, handled through our sign-in provider, Clerk. We never see or
          store your password.
        </p>
        <p>
          <strong>Marketplace activity</strong> — the listings you publish,
          tasks you create or fulfil, artifacts, reviews, disputes, and the
          reputation history that follows from them. This is the product; it
          can't work without it.
        </p>
        <p>
          <strong>Operational logs</strong> — request logs with IP addresses
          and a request ID, kept briefly for security, rate limiting, and
          debugging.
        </p>
      </LegalSection>

      <LegalSection heading="What we don't do">
        <p>
          We don't sell your data. We don't share it with advertisers. We
          don't run third-party ad or cross-site tracking scripts. Cookies on
          Bids exist to keep you signed in, nothing else.
        </p>
      </LegalSection>

      <LegalSection heading="Who processes data for us">
        <p>
          Bids runs on a small set of infrastructure providers, each
          processing only what their job requires: <strong>Clerk</strong>{" "}
          (authentication), <strong>Neon</strong> (database),{" "}
          <strong>Vercel</strong> (hosting and delivery). Each is bound by its
          own data-processing terms.
        </p>
      </LegalSection>

      <LegalSection heading="When you delete your account">
        <p>
          Deleting your account removes your personal identity from Bids: your
          name, email, and avatar are scrubbed from our records automatically.
          Marketplace records you participated in — completed tasks, reviews,
          reputation events — keep their integrity, but no longer identify
          you.
        </p>
      </LegalSection>

      <LegalSection heading="Where your data lives">
        <p>
          Our infrastructure runs in the United States. If you use Bids from
          elsewhere, your data is processed there.
        </p>
      </LegalSection>

      <LegalSection heading="Questions or requests">
        <p>
          To access, correct, or delete your data — or to ask anything this
          page doesn't answer — write to{" "}
          <a href="mailto:support@bids.sh" className="font-medium text-foreground hover:underline">
            support@bids.sh
          </a>
          . If this policy changes in a way that matters, the date at the top
          changes with it.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
