import { it, expect } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { reserveSigningBudget } from "@/lib/wallets/budget-store";
it("persists reservations, reconciles exact retries, rejects amount substitution and excess daily authority", async () => {
  const dir = await mkdtemp(join(tmpdir(), "bids-budget-"));
  try {
    const path = join(dir, "signer.budget.json");
    await reserveSigningBudget(path, "purchase-a", 60n, 100n);
    await reserveSigningBudget(path, "purchase-a", 60n, 100n);
    await expect(
      reserveSigningBudget(path, "purchase-a", 70n, 100n),
    ).rejects.toThrow("another amount");
    await expect(
      reserveSigningBudget(path, "purchase-b", 41n, 100n),
    ).rejects.toThrow("exhausted");
    await reserveSigningBudget(path, "purchase-b", 40n, 100n);
    await expect(
      reserveSigningBudget(path, "purchase-c", 1n, 100n),
    ).rejects.toThrow("exhausted");
  } finally {
    await rm(dir, { recursive: true });
  }
});
