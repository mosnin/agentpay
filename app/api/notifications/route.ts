import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// Polled by the header bell — always compute fresh, never cache.
export const dynamic = "force-dynamic";

// GET /api/notifications — the current user's unread count plus their latest
// 15 notifications, newest first. 401 (JSON) when signed out / keyless with
// no seeded demo operator.
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const [unread, notifications] = await Promise.all([
      prisma.notification.count({ where: { userId: user.id, readAt: null } }),
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          href: true,
          readAt: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({ unread, notifications });
  } catch (err) {
    console.error("GET /api/notifications failed", err);
    return NextResponse.json({ error: "Failed to load notifications." }, { status: 500 });
  }
}
