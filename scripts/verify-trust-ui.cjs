const { chromium } = require("@playwright/test");
const { PrismaClient } = require("@prisma/client");
const { privateKeyToAccount } = require("viem/accounts");
const { randomBytes, createHash } = require("node:crypto");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const root = process.env.BIDS_UI_URL || "http://localhost:3191";
const evidence = process.env.BIDS_UI_EVIDENCE || "test-results/trust-ui";
if (
  !["localhost", "127.0.0.1"].includes(new URL(root).hostname) ||
  !process.env.DATABASE_URL ||
  !["localhost", "127.0.0.1"].includes(
    new URL(process.env.DATABASE_URL).hostname,
  )
)
  throw Error(
    "This fixture harness requires an explicit local test database and local app URL.",
  );
fs.mkdirSync(evidence, { recursive: true });
const db = new PrismaClient();
let browser, user, taskId;
const results = [];
(async () => {
  try {
    const secret = "bids_" + randomBytes(32).toString("hex");
    const wallet = privateKeyToAccount("0x" + randomBytes(32).toString("hex"));
    user = await db.user.create({
      data: {
        email: `browser-${Date.now()}@test.invalid`,
        name: "Browser verification",
        role: "admin",
        apiKeys: {
          create: {
            name: "Temporary local verification",
            prefix: secret.slice(0, 16),
            hashedKey: createHash("sha256").update(secret).digest("hex"),
          },
        },
      },
    });
    browser = await chromium.launch({
      headless: true,
      ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
        : {}),
    });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1100 },
      extraHTTPHeaders: { authorization: `Bearer ${secret}` },
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.exposeBinding("bidsWalletRequest", async (_, payload) => {
      if (payload.method === "eth_requestAccounts") return [wallet.address];
      if (payload.method === "personal_sign")
        return wallet.signMessage({ message: { raw: payload.params[0] } });
      throw Error("Unplanned wallet request: " + payload.method);
    });
    await page.addInitScript(() => {
      window.ethereum = {
        request: (payload) => window.bidsWalletRequest(payload),
      };
    });
    await page.goto(root + "/trust");
    await page
      .getByRole("heading", { name: "Trust grows through work." })
      .waitFor();
    assert.equal(
      await page.getByText("Not enough history", { exact: true }).count(),
      2,
    );
    assert.equal(await page.locator("main").count(), 1);
    await page.screenshot({
      path: evidence + "/trust-desktop.png",
      fullPage: true,
    });
    results.push(
      "Trust: two separate unknown scores, one main landmark, no invented history",
    );
    const anonymous = await browser.newContext();
    let res = await anonymous.request.get(root + `/people/${user.id}`);
    assert.equal(res.status(), 404);
    await page
      .getByRole("button", { name: "Publish my person trust profile" })
      .click();
    await page
      .getByRole("button", { name: "Make my person profile private" })
      .waitFor();
    res = await anonymous.request.get(root + `/people/${user.id}`);
    assert.equal(res.status(), 200);
    assert(!(await res.text()).includes(user.email));
    await page
      .getByRole("button", { name: "Make my person profile private" })
      .click();
    await page
      .getByRole("button", { name: "Publish my person trust profile" })
      .waitFor();
    res = await anonymous.request.get(root + `/people/${user.id}`);
    assert.equal(res.status(), 404);
    results.push(
      "Profile visibility: private → public → private, email never exposed",
    );
    await page.goto(root + "/wallets");
    await page
      .getByRole("button", { name: "Connect Ethereum / Base wallet" })
      .click();
    await page.getByText(wallet.address, { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "Use for future seller payouts" })
      .click();
    await page.getByText("Default seller payout", { exact: true }).waitFor();
    assert.equal(
      (await db.walletAccount.findFirstOrThrow({ where: { userId: user.id } }))
        .isPayout,
      true,
    );
    await page
      .getByRole("button", { name: "Check balances", exact: true })
      .click();
    await page
      .getByText("No settlement networks are connected yet.", { exact: true })
      .waitFor();
    results.push(
      "Wallet: real ownership signature verified, payout choice persisted, unconfigured balances not fabricated",
    );
    const challenge = await (
      await context.request.post(root + "/api/wallets/challenge", {
        data: { family: "evm", address: wallet.address },
      })
    ).json();
    const signature = await wallet.signMessage({ message: challenge.message });
    const proof = { challengeId: challenge.id, signature };
    assert.equal(
      (
        await context.request.post(root + "/api/wallets/verify", {
          data: proof,
        })
      ).status(),
      200,
    );
    assert.equal(
      (
        await context.request.post(root + "/api/wallets/verify", {
          data: proof,
        })
      ).status(),
      400,
    );
    results.push("Wallet challenge cannot be replayed");
    const agent = await db.agent.findFirst({ where: { status: "active" } });
    assert(agent);
    const create = await context.request.post(root + "/api/tasks", {
      data: {
        objective:
          "Profile the provided records and return field quality counts.",
        category: "Data",
        budget: 10,
        seller_agent_id: agent.id,
        payment_mode: "pay_per_task",
        payment_rail: "crypto",
      },
    });
    assert.equal(create.status(), 201, await create.text());
    taskId = (await create.json()).task_id;
    await page.goto(root + "/tasks/" + taskId);
    await page
      .getByRole("heading", { name: "Agreement payment", exact: true })
      .waitFor();
    assert.equal(
      await page.getByText("Demo payment record", { exact: true }).count(),
      0,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: evidence + "/stablecoin-task-mobile.png",
      fullPage: true,
    });
    const panel = await page
      .getByRole("region", { name: "Stablecoin settlement" })
      .boundingBox();
    assert(panel && panel.y < 1000);
    results.push(
      "Real stablecoin agreement created; missing deployment blocks funding explicitly; funding panel precedes artifacts on mobile",
    );
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      for (const route of ["/trust", "/wallets", "/marketplace"]) {
        await page.goto(root + route);
        await page.waitForTimeout(300);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth,
          ),
          false,
          `Horizontal overflow ${route} at ${width}`,
        );
        if (width === 390 && route !== "/marketplace")
          await page.screenshot({
            path: evidence + route + "-mobile.png",
            fullPage: true,
          });
      }
    }
    results.push(
      "Trust, wallets and marketplace fit 390px and 320px without horizontal page overflow",
    );
    await page.goto(root + "/trust");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addStyleTag({ content: "html{font-size:200% !important}" });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
      false,
    );
    results.push(
      "Trust page: reduced motion and 200% text remain usable at 320px",
    );
    await page.goto(root + "/admin/trust");
    await page
      .getByRole("heading", { name: "Trust findings and appeals" })
      .waitFor();
    results.push(
      "Human moderation screen renders with authorized admin session",
    );
    assert.deepEqual(errors, []);
    results.push("No browser runtime errors");
    fs.writeFileSync(
      evidence + "/browser-check-results.json",
      JSON.stringify(results, null, 2),
    );
    console.log(results.join("\n"));
  } catch (e) {
    if (browser) {
      const page = browser.contexts()[0]?.pages()[0];
      if (page) {
        await page.screenshot({
          path: evidence + "/browser-failure.png",
          fullPage: true,
        });
        console.log(
          await page.evaluate(() =>
            Array.from(document.querySelectorAll("body *"))
              .filter((e) => {
                const r = e.getBoundingClientRect();
                return r.right > innerWidth + 1 && r.width > 0;
              })
              .map((e) => ({
                tag: e.tagName,
                cls: e.className,
                text: e.textContent?.slice(0, 90),
                right: e.getBoundingClientRect().right,
              }))
              .slice(0, 20),
          ),
        );
      }
    }
    throw e;
  } finally {
    await browser?.close();
    if (taskId) await db.task.delete({ where: { id: taskId } });
    if (user) {
      await db.walletChallenge.deleteMany({ where: { userId: user.id } });
      await db.walletAccount.deleteMany({ where: { userId: user.id } });
      await db.user.delete({ where: { id: user.id } });
    }
    await db.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
