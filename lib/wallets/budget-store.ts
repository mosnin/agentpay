import { mkdir, open, rename, unlink, rmdir } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
/** Local trusted-signer budget. Pending authorizations count; a crash never frees a reservation. */
export async function reserveSigningBudget(
  file: string,
  requestId: string,
  amount: bigint,
  dailyCap: bigint,
  now = new Date(),
) {
  if (amount <= 0n || dailyCap <= 0n || amount > dailyCap)
    throw Error("Authorization exceeds daily budget.");
  await mkdir(dirname(file), { recursive: true, mode: 0o700 });
  const lock = `${file}.lock`;
  try {
    await mkdir(lock, { mode: 0o700 });
  } catch {
    throw Error(
      "Budget signer is busy or requires crash recovery. Do not remove its lock while a signer is running.",
    );
  }
  let temp: string | undefined;
  try {
    let state: { day: string; used: string; requests: Record<string, string> } =
      { day: now.toISOString().slice(0, 10), used: "0", requests: {} };
    try {
      const handle = await open(
        file,
        constants.O_RDONLY | constants.O_NOFOLLOW,
      );
      try {
        if ((await handle.stat()).size > 2000000)
          throw Error("Budget journal needs archival.");
        const prior = JSON.parse(await handle.readFile("utf8"));
        if (prior.day === state.day) state = prior;
      } finally {
        await handle.close();
      }
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
    if (Object.hasOwn(state.requests, requestId)) {
      if (state.requests[requestId] !== amount.toString())
        throw Error("Payment identifier reused with another amount.");
      return;
    }
    if (BigInt(state.used) + amount > dailyCap)
      throw Error("Daily authorization budget exhausted.");
    state.used = (BigInt(state.used) + amount).toString();
    state.requests[requestId] = amount.toString();
    temp = `${file}.${randomUUID()}.tmp`;
    const handle = await open(
      temp,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL,
      0o600,
    );
    try {
      await handle.writeFile(JSON.stringify(state));
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temp, file);
    temp = undefined;
  } finally {
    if (temp) await unlink(temp).catch(() => {});
    await rmdir(lock);
  }
}
