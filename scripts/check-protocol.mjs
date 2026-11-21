import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("protocol/client-release.json", root)));
if (manifest.protocol !== "agent-economy/1" || !/^[0-9a-f]{40}$/.test(manifest.revision))
  throw Error("Invalid Agent Economy client revision.");
for (const [file, expected] of Object.entries(manifest.files)) {
  if (!/^(src|protocol)\/[\w.-]+$/.test(file)) throw Error("Invalid protocol client file " + file);
  const hash = createHash("sha256").update(await readFile(new URL(file, root))).digest("hex");
  if (hash !== expected) throw Error("Agent Economy client differs from its pinned revision at " + file);
}
