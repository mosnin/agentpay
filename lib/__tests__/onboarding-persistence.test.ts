import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
  organization: { create: vi.fn() },
  lock: vi.fn(),
  requireUser: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (fn: (tx: unknown) => unknown) =>
      fn({
        user: mocks.user,
        organization: mocks.organization,
        $queryRaw: mocks.lock,
      }),
  },
}));
import { completeOnboarding } from "@/lib/actions/onboarding";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "u" });
});
it("keeps an invitation membership when individual setup is chosen", async () => {
  mocks.user.findUniqueOrThrow.mockResolvedValue({
    id: "u",
    organizationId: "invited-org",
    onboardedAt: null,
  });
  expect(
    await completeOnboarding({ intent: "buyer", organizationMode: "skip" }),
  ).toEqual({ ok: true });
  expect(mocks.user.update.mock.calls[0][0].data.organizationId).toBe(
    "invited-org",
  );
  expect(mocks.organization.create).not.toHaveBeenCalled();
});
it("replayed setup is a no-op after the user row is locked", async () => {
  mocks.user.findUniqueOrThrow.mockResolvedValue({
    id: "u",
    organizationId: "org",
    onboardedAt: new Date(),
  });
  expect(
    await completeOnboarding({
      intent: "seller",
      organizationMode: "create",
      organizationName: "Another team",
    }),
  ).toEqual({ ok: true });
  expect(mocks.lock).toHaveBeenCalledOnce();
  expect(mocks.organization.create).not.toHaveBeenCalled();
  expect(mocks.user.update).not.toHaveBeenCalled();
});
it("creates organization and onboarding inside one transaction", async () => {
  mocks.user.findUniqueOrThrow.mockResolvedValue({
    id: "u",
    organizationId: null,
    onboardedAt: null,
  });
  mocks.organization.create.mockResolvedValue({ id: "new-org" });
  expect(
    await completeOnboarding({
      intent: "seller",
      organizationMode: "create",
      organizationName: "Team",
    }),
  ).toEqual({ ok: true });
  expect(mocks.user.update.mock.calls[0][0].data.organizationId).toBe(
    "new-org",
  );
});
