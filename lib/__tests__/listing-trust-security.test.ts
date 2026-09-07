import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ user: vi.fn(), find: vi.fn(), create: vi.fn(), update: vi.fn(), verify: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireUser: mock.user }));
vi.mock("@/lib/prisma", () => ({ prisma: { agent: { findUnique: mock.find, create: mock.create, update: mock.update } } }));
vi.mock("@/lib/actions/verification", () => ({ requestVerification: mock.verify }));
vi.mock("@/lib/reputation", () => ({ recordReputationEvent: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { createAgent, updateAgent, setOwnedAgentStatus, verifyAgent } from "@/lib/actions/agents";
const listing = { name: "Data profiler", shortDescription: "Profile CSV files", longDescription: "Return a structured profile of a CSV file", category: "Data", capabilities: ["csv"], pricingModel: "per_task", startingPrice: 10 };
beforeEach(() => { vi.clearAllMocks(); mock.user.mockResolvedValue({ id: "seller", organizationId: "own-team", role: "operator" }); mock.find.mockResolvedValue({ ownerId: "seller", status: "active" }); });
it("rejects self-awarded verification on create and update", async () => {
  expect((await createAgent({ ...listing, verified: true })).ok).toBe(false);
  expect((await updateAgent({ id: "agent", verified: true })).ok).toBe(false);
  expect(mock.create).not.toHaveBeenCalled(); expect(mock.update).not.toHaveBeenCalled();
});
it("refuses an unrelated organization on create and update", async () => {
  expect(await createAgent({ ...listing, organizationId: "other-team" })).toMatchObject({ ok: false, error: "You can only publish under your own organization." });
  expect((await updateAgent({ id: "agent", organizationId: "other-team" })).ok).toBe(false);
  expect(mock.create).not.toHaveBeenCalled(); expect(mock.update).not.toHaveBeenCalled();
});
it("invalidates verification when the verified listing changes", async () => {
  mock.update.mockResolvedValue({ id: "agent", slug: "profile" });
  expect((await updateAgent({ id: "agent", endpointUrl: "https://new.example.test" })).ok).toBe(true);
  expect(mock.update.mock.calls[0][0].data).toMatchObject({ verified: false, verificationStatus: "unverified", lastVerificationAttemptAt: null });
});
it("cannot resume a moderation-suspended listing or inject a forbidden status", async () => {
  mock.find.mockResolvedValue({ ownerId: "seller", status: "suspended" });
  expect((await setOwnedAgentStatus("agent", "active")).ok).toBe(false);
  expect((await setOwnedAgentStatus("agent", "suspended" as "active")).ok).toBe(false);
  expect(mock.update).not.toHaveBeenCalled();
});
it("admin verification runs evidence checks instead of setting a badge directly", async () => {
  mock.user.mockResolvedValue({ id: "admin", role: "admin" });
  mock.verify.mockResolvedValue({ ok: true, data: { verified: false, verificationError: "Endpoint is unavailable" } });
  expect(await verifyAgent("agent")).toMatchObject({ ok: false, error: "Endpoint is unavailable" });
  expect(mock.verify).toHaveBeenCalledWith("agent"); expect(mock.update).not.toHaveBeenCalled();
});

it("clears organization attribution when the owner explicitly chooses none", async () => {
  mock.update.mockResolvedValue({ id: "agent", slug: "profile" });
  expect((await updateAgent({ id: "agent", organizationId: "" })).ok).toBe(true);
  expect(mock.update.mock.calls[0][0].data.organizationId).toBeNull();
});
