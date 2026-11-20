// A fresh content key per block. Each intended recipient gets its own X25519/HKDF wrap.
import { getBytes, hexlify } from "ethers";
const hex = (value) => hexlify(new Uint8Array(value));
const utf = new TextEncoder();
const subtle = globalThis.crypto.subtle;
const random = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n));
export async function makeKeys() {
  const kp = await subtle.generateKey({ name: "X25519" }, true, ["deriveBits"]);
  return {
    publicKey: hex(await subtle.exportKey("raw", kp.publicKey)),
    privateKey: hex(await subtle.exportKey("pkcs8", kp.privateKey)),
  };
}
async function wrappingKey(priv, pub, salt, context) {
  const privateKey =
    typeof priv === "string"
      ? await subtle.importKey("pkcs8", getBytes(priv), "X25519", false, [
          "deriveBits",
        ])
      : priv;
  const publicKey = await subtle.importKey(
    "raw",
    getBytes(pub),
    "X25519",
    false,
    [],
  );
  const bits = await subtle.deriveBits(
    { name: "X25519", public: publicKey },
    privateKey,
    256,
  );
  const material = await subtle.importKey("raw", bits, "HKDF", false, [
    "deriveKey",
  ]);
  return subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info: utf.encode(context) },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
const aes = (iv, context) => ({
  name: "AES-GCM",
  iv,
  additionalData: utf.encode(context),
});
export async function seal(data, recipients, context) {
  const eph = await makeKeys(),
    key = await subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
      "encrypt",
    ]);
  const raw = await subtle.exportKey("raw", key),
    salt = random(32),
    iv = random(12),
    slots = [];
  for (const pub of new Set(recipients)) {
    const wrapping = await wrappingKey(eph.privateKey, pub, salt, context),
      nonce = random(12);
    slots.push({
      pub,
      iv: hexlify(nonce),
      wrap: hex(await subtle.encrypt(aes(nonce, context), wrapping, raw)),
    });
  }
  return utf.encode(
    JSON.stringify({
      v: 1,
      context,
      eph: eph.publicKey,
      salt: hexlify(salt),
      iv: hexlify(iv),
      slots,
      ciphertext: hex(
        await subtle.encrypt(
          aes(iv, context),
          key,
          utf.encode(JSON.stringify(data)),
        ),
      ),
    }),
  );
}
export async function openEnvelope(bytes, recipient, context) {
  const e = JSON.parse(new TextDecoder().decode(bytes));
  if (e.v !== 1 || e.context !== context)
    throw Error("Checkpoint belongs to a different turn.");
  const s = e.slots.find((s) => s.pub === recipient.publicKey);
  if (!s) throw Error("This device has no recipient key for this checkpoint.");
  const wrapping = await wrappingKey(
    recipient.privateKey,
    e.eph,
    getBytes(e.salt),
    context,
  );
  const raw = await subtle.decrypt(
    aes(getBytes(s.iv), context),
    wrapping,
    getBytes(s.wrap),
  );
  const key = await subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
  return JSON.parse(
    new TextDecoder().decode(
      await subtle.decrypt(
        aes(getBytes(e.iv), context),
        key,
        getBytes(e.ciphertext),
      ),
    ),
  );
}
