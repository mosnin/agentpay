import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  profile: vi.fn(),
  auth: vi.fn(),
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
  },
}));
vi.mock("react", () => ({ cache: (fn: unknown) => fn }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
  currentUser: mocks.profile,
}));
vi.mock("@/lib/api-keys", () => ({ resolveApiKeyUser: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: mocks.user,
    $transaction: (fn: (tx: unknown) => unknown) => fn({ user: mocks.user }),
  },
}));
import { getCurrentUser } from "@/lib/auth";
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_fixture");
  vi.stubEnv("CLERK_SECRET_KEY", "sk_test_fixture");
  vi.stubEnv("ADMIN_EMAILS", "admin@example.test");
  mocks.auth.mockResolvedValue({ userId: "clerk-new" });
  mocks.profile.mockResolvedValue({
    id: "clerk-new",
    primaryEmailAddress: {
      emailAddress: "admin@example.test",
      verification: { status: "verified" },
    },
    imageUrl: "",
    firstName: "Test",
  });
});
it("rejects unverified emails before account lookup or admin promotion", async () => {
  mocks.profile.mockResolvedValue({
    id: "clerk-new",
    primaryEmailAddress: {
      emailAddress: "admin@example.test",
      verification: { status: "unverified" },
    },
  });
  expect(await getCurrentUser()).toBeNull();
  expect(mocks.user.findUnique).not.toHaveBeenCalled();
});
it("rejects a provider profile belonging to another session", async () => {
  mocks.auth.mockResolvedValue({ userId: "different-session" });
  expect(await getCurrentUser()).toBeNull();
  expect(mocks.user.findUnique).not.toHaveBeenCalled();
});
it("does not replace another Clerk identity even with the same verified email", async () => {
  mocks.user.findUnique
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce({ id: "owner", clerkId: "clerk-original" });
  expect(await getCurrentUser()).toBeNull();
  expect(mocks.user.updateMany).not.toHaveBeenCalled();
  expect(mocks.user.create).not.toHaveBeenCalled();
});
it("adopts an unbound verified-email account with a conditional write", async () => {
  const user = { id: "owner", clerkId: "clerk-new", role: "admin" };
  mocks.user.findUnique
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce({ id: "owner", clerkId: null })
    .mockResolvedValueOnce(user);
  mocks.user.updateMany.mockResolvedValue({ count: 1 });
  expect(await getCurrentUser()).toEqual(user);
  expect(mocks.user.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({ where: { id: "owner", clerkId: null } }),
  );
});
it("fails closed if a competing login claims the account first", async () => {
  mocks.user.findUnique
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce({ id: "owner", clerkId: null });
  mocks.user.updateMany.mockResolvedValue({ count: 0 });
  expect(await getCurrentUser()).toBeNull();
});
it("uses current verified email rather than stale database email for admin bootstrap", async () => {
  const profile = await mocks.profile();
  profile.primaryEmailAddress.emailAddress = "ordinary@example.test";
  const user = { id: "owner", email: "admin@example.test", role: "operator" };
  mocks.user.findUnique.mockResolvedValue(user);
  expect(await getCurrentUser()).toEqual(user);
  expect(mocks.user.update).not.toHaveBeenCalled();
});
