import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    // Mirror the tsconfig "@/*" -> "./*" path alias.
    alias: { "@": root },
  },
  test: {
    environment: "node",
    env: { NEXT_PUBLIC_BIDS_PAYMENT_MODE: "demo" },
    include: ["lib/**/*.test.ts"],
  },
});
