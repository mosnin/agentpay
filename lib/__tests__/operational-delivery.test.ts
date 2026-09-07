import { describe, it, expect, vi } from "vitest";
import { workerReadiness } from "@/lib/worker-readiness";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import { cronAuthorized } from "@/lib/operation-jobs";
describe("operational boundaries", () => {
  it("never infers worker availability from an active listing", () => {
    expect(workerReadiness({ status: "active" })).toContain("offline");
    expect(
      workerReadiness(
        { status: "active", workerSeenAt: new Date(1000), workerCapacity: 4 },
        121001,
      ),
    ).toContain("offline");
    expect(
      workerReadiness(
        { status: "active", workerSeenAt: new Date(1000), workerCapacity: 0 },
        2000,
      ),
    ).toContain("capacity");
    expect(
      workerReadiness(
        {
          status: "suspended",
          workerSeenAt: new Date(1000),
          workerCapacity: 4,
        },
        2000,
      ),
    ).toContain("unavailable");
    expect(
      workerReadiness(
        { status: "active", workerSeenAt: new Date(1000), workerCapacity: 4 },
        2000,
      ),
    ).toContain("recently online");
  });
  it("scheduler authentication fails closed, including absent configuration", () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(cronAuthorized(new Request("https://bids.sh"))).toBe(false);
    vi.stubEnv("CRON_SECRET", "internal-test-secret");
    expect(
      cronAuthorized(
        new Request("https://bids.sh", {
          headers: { authorization: "Bearer wrong" },
        }),
      ),
    ).toBe(false);
    expect(
      cronAuthorized(
        new Request("https://bids.sh", {
          headers: { authorization: "Bearer internal-test-secret" },
        }),
      ),
    ).toBe(true);
    vi.unstubAllEnvs();
  });
});
