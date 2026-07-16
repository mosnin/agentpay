import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Clerk → Bids user lifecycle sync.
 *
 * Configure in the Clerk Dashboard (Webhooks → add endpoint
 * https://<domain>/api/webhooks/clerk, events: user.updated, user.deleted)
 * and set CLERK_WEBHOOK_SIGNING_SECRET. Without the secret the endpoint
 * refuses to process anything.
 *
 * user.updated — keep name/avatar/email in sync so the app never shows
 * stale identity next to a user's work.
 * user.deleted — scrub PII from the local row. Marketplace records the
 * user participated in (agents, tasks, reviews) keep their integrity;
 * the person's identity leaves with them.
 */
export async function POST(request: NextRequest) {
  if (!process.env.CLERK_WEBHOOK_SIGNING_SECRET) {
    return NextResponse.json(
      { error: "Webhook signing secret is not configured." },
      { status: 503 },
    );
  }

  let evt: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    evt = await verifyWebhook(request);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    if (evt.type === "user.updated") {
      const data = evt.data;
      const primaryEmail =
        data.email_addresses?.find((e) => e.id === data.primary_email_address_id)
          ?.email_address ?? data.email_addresses?.[0]?.email_address;
      const name =
        [data.first_name, data.last_name].filter(Boolean).join(" ").trim() || null;

      const user = await prisma.user.findUnique({ where: { clerkId: data.id } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            name,
            image: data.image_url ?? null,
            // Email is the adopt-by-email key — only follow a change when it
            // doesn't collide with another local account.
            ...(primaryEmail &&
            primaryEmail !== user.email &&
            !(await prisma.user.findUnique({ where: { email: primaryEmail } }))
              ? { email: primaryEmail }
              : {}),
          },
        });
      }
    }

    if (evt.type === "user.deleted" && evt.data.id) {
      const user = await prisma.user.findUnique({
        where: { clerkId: evt.data.id },
      });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            clerkId: null,
            name: null,
            image: null,
            email: `deleted-${user.id}@users.bids.sh`,
          },
        });
      }
    }
  } catch (err) {
    console.error("clerk webhook handling failed", err);
    return NextResponse.json({ error: "Handler error." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
