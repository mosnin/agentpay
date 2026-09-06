import { execFileSync } from "node:child_process";
import { expect, it } from "vitest";

it("admits the exact production Clerk host in script and connection policies", () => {
  const publishable = "pk_live_" + Buffer.from("clerk.bids.sh$").toString("base64");
  const headers = JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", "import config from './next.config.mjs'; console.log(JSON.stringify(await config.headers()));"], { env: { ...process.env, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: publishable, NODE_ENV: "production" }, encoding: "utf8" }));
  const csp = headers[0].headers.find((h: { key: string }) => h.key === "Content-Security-Policy").value as string;
  expect(csp.split("; ").find(d => d.startsWith("script-src"))).toContain("https://clerk.bids.sh");
  expect(csp.split("; ").find(d => d.startsWith("connect-src"))).toContain("https://clerk.bids.sh");
  expect(csp).not.toContain("unsafe-eval");
});
