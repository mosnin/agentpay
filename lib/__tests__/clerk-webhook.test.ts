import { beforeEach, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  user: { findUnique: vi.fn(), update: vi.fn() },
  apiKey: { updateMany: vi.fn() },
}));
vi.mock("@clerk/nextjs/webhooks", () => ({ verifyWebhook: mocks.verify }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: mocks.user,
    $transaction: (fn: (tx: unknown) => unknown) =>
      fn({ user: mocks.user, apiKey: mocks.apiKey }),
  },
}));
import { POST } from "@/app/api/webhooks/clerk/route";
const request = () =>
  new Request("http://localhost/api/webhooks/clerk", {
    method: "POST",
  }) as NextRequest;
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("CLERK_WEBHOOK_SIGNING_SECRET", "fixture-secret");
  mocks.user.findUnique.mockResolvedValue({
    id: "owner",
    email: "old@example.test",
  });
});
it("rejects an invalid signature without touching credentials", async () => {
  mocks.verify.mockRejectedValue(Error("bad signature"));
  expect((await POST(request())).status).toBe(400);
  expect(mocks.apiKey.updateMany).not.toHaveBeenCalled();
});
it("revokes all active agent keys and removes admin/public-profile status on deletion", async () => {
  mocks.verify.mockResolvedValue({
    type: "user.deleted",
    data: { id: "clerk-deleted" },
  });
  expect((await POST(request())).status).toBe(200);
  expect(mocks.apiKey.updateMany).toHaveBeenCalledWith({
    where: { userId: "owner", revokedAt: null },
    data: { revokedAt: expect.any(Date) },
  });
  expect(mocks.user.update).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        clerkId: null,
        role: "operator",
        publicTrustProfile: false,
      }),
    }),
  );
});
it("does not acknowledge deletion when credential revocation fails", async () => {
  mocks.verify.mockResolvedValue({
    type: "user.deleted",
    data: { id: "clerk-deleted" },
  });
  mocks.apiKey.updateMany.mockRejectedValue(Error("database offline"));
  expect((await POST(request())).status).toBe(500);
  expect(mocks.user.update).not.toHaveBeenCalled();
});
it("does not sync an unverified primary email", async () => {
  mocks.verify.mockResolvedValue({
    type: "user.updated",
    data: {
      id: "clerk-user",
      primary_email_address_id: "email-1",
      email_addresses: [
        {
          id: "email-1",
          email_address: "admin@example.test",
          verification: { status: "unverified" },
        },
      ],
    },
  });
  expect((await POST(request())).status).toBe(200);
  expect(mocks.user.update.mock.calls[0][0].data).not.toHaveProperty("email");
});
