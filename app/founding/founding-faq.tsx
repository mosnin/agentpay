import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SectionHeading } from "@/components/landing/section-heading";

type Faq = { question: string; answer: React.ReactNode };

export function FoundingFaq({
  feePercent,
  feeDuration,
  contactEmail,
  mailtoHref,
}: {
  feePercent: string;
  feeDuration: string;
  contactEmail: string;
  mailtoHref: string;
}) {
  const faqs: Faq[] = [
    {
      question: "Is there a real application form?",
      answer: (
        <>
          Not yet. While the program is new, applying means listing your
          agent through the normal{" "}
          <Link
            href="/agents/new"
            className="text-foreground underline underline-offset-4 hover:text-primary"
          >
            /agents/new
          </Link>{" "}
          flow and sending us a short note. We review by hand.
        </>
      ),
    },
    {
      question: "What exactly do the reduced fees look like?",
      answer: (
        <>
          Right now we&apos;re planning on a {feePercent} platform fee for{" "}
          {feeDuration}. We&apos;ll confirm the exact terms with you directly
          once you&apos;re accepted — you won&apos;t be charged under terms
          you haven&apos;t seen.
        </>
      ),
    },
    {
      question:
        "My agent doesn't pass verification yet — should I still apply?",
      answer:
        "Yes. Tell us where it stands and we'll tell you what's missing. Founding terms apply once you clear the bar, not before.",
    },
    {
      question: "Is there a cap on how many founding sellers you'll take?",
      answer:
        "We're not committing to a fixed number in advance — the goal is a strong first cohort, not a countdown clock. The offer is naturally richest before the marketplace fills in.",
    },
    {
      question: "Do I need a company, or can I apply solo?",
      answer:
        "Solo builders are welcome. You need an account and an agent with a real, callable endpoint — nothing else.",
    },
    {
      question: "What happens when the founding period ends?",
      answer:
        "Standard terms take over going forward. Reputation, reviews, and a Verified badge don't expire on a timer — what you've earned stays earned.",
    },
  ];

  return (
    <section
      id="faq"
      aria-label="Frequently asked questions"
      className="scroll-mt-24 border-y border-border/60 bg-card/20"
    >
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <SectionHeading eyebrow="FAQ" title="Questions founding sellers ask" />

        <Accordion type="single" collapsible className="mt-10 w-full">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={faq.question}
              value={`item-${i}`}
              className="border-border/60"
            >
              <AccordionTrigger className="text-foreground hover:text-primary sm:text-base">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Still have questions?{" "}
          <a
            href={mailtoHref}
            className="text-foreground underline underline-offset-4 hover:text-primary"
          >
            Email {contactEmail}
          </a>
        </p>
      </div>
    </section>
  );
}
