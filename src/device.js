import { hexlify, getBytes } from "ethers";
import { requireWalletOrigin } from "./release-origin.js";
let opened;
function db() {
  if (!opened)
    opened = new Promise((resolve, reject) => {
      const req = indexedDB.open("relay-device-keys", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("keys");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  return opened;
}
export async function lookupLocalKey(addr) {
  requireWalletOrigin();
  const handle = await db();
  return new Promise((resolve, reject) => {
    const r = handle.transaction("keys").objectStore("keys").get(addr);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function storeLocalKey(id, value, onlyIfNew = false) {
  requireWalletOrigin();
  if (onlyIfNew) return saveLocalKey(id, value);
  const store = await db();
  await new Promise((resolve, reject) => {
    const tx = store.transaction("keys", "readwrite"),
      records = tx.objectStore("keys");
    if (value === null) records.delete(id);
    else records.put(value, id);
    tx.oncomplete = resolve;
    tx.onabort = () =>
      reject(tx.error || Error("Could not update the local chat key."));
  });
}
export async function deviceKey(address) {
  requireWalletOrigin();
  const addr = address.toLowerCase(),
    existing = await lookupLocalKey(addr);
  if (existing) return existing;
  const legacyKey = "relay.recipient." + addr,
    legacy = localStorage.getItem(legacyKey);
  let value;
  if (legacy) {
    const k = JSON.parse(legacy);
    value = {
      publicKey: k.publicKey,
      privateKey: await crypto.subtle.importKey(
        "pkcs8",
        getBytes(k.privateKey),
        "X25519",
        false,
        ["deriveBits"],
      ),
    };
  } else {
    const pair = await crypto.subtle.generateKey("X25519", false, [
      "deriveBits",
    ]);
    value = {
      publicKey: hexlify(
        new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey)),
      ),
      privateKey: pair.privateKey,
    };
  }
  const saved = await saveLocalKey(addr, value);
  if (legacy) localStorage.removeItem(legacyKey);
  return saved;
}

// Preserve the first enrolled primary key if another tab is creating it.
async function saveLocalKey(addr, value) {
  requireWalletOrigin();
  const store = await db();
  return new Promise((resolve, reject) => {
    const tx = store.transaction("keys", "readwrite"),
      records = tx.objectStore("keys");
    const request = records.get(addr);
    let saved;
    request.onsuccess = () => {
      saved = request.result ?? value;
      if (!request.result) records.add(value, addr);
    };
    tx.oncomplete = () => resolve(saved);
    tx.onabort = () =>
      reject(tx.error || Error("Device key could not be persisted."));
  });
}
