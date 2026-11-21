import {
  Aes256Gcm,
  CipherSuite,
  DhkemX25519HkdfSha256,
  HkdfSha256,
} from "@hpke/core";
import { getBytes } from "ethers";

const suite = new CipherSuite({
  kem: new DhkemX25519HkdfSha256(),
  kdf: new HkdfSha256(),
  aead: new Aes256Gcm(),
});
const magic = Uint8Array.of(65, 69, 2);
const slotSize = 80;
const limit = 8 * 1024 * 1024;
const encoder = new TextEncoder();
const random = (size) => crypto.getRandomValues(new Uint8Array(size));
function join(...parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.byteLength, 0));
  let pos = 0;
  for (const part of parts) {
    const data = new Uint8Array(part);
    out.set(data, pos);
    pos += data.length;
  }
  return out;
}
export function isOpaque(bytes) {
  return magic.every((v, i) => bytes[i] === v);
}
function binding(context) {
  if (typeof context !== "string" || !context.length || context.length > 4096)
    throw Error("Invalid envelope scope.");
  return encoder.encode(JSON.stringify(["agent-economy/hpke/v2", context]));
}
export async function sealOpaque(value, readers, context, bucket = 0) {
  const pubs = [...new Set(readers)],
    info = binding(context),
    iv = random(12),
    raw = random(32);
  if (
    !pubs.length ||
    pubs.length > 32 ||
    ![0, 256, 1024, 4096].includes(bucket)
  )
    throw Error("Invalid envelope policy.");
  const json = encoder.encode(JSON.stringify(value));
  const size = bucket
    ? Math.ceil((json.length + 4) / bucket) * bucket
    : json.length + 4;
  if (size > limit) throw Error("Envelope too large.");
  const body = new Uint8Array(size);
  new DataView(body.buffer).setUint32(0, json.length);
  body.set(json, 4);
  json.fill(0);
  try {
    const slots = await Promise.all(
      pubs.map(async (pub) => {
        const recipientPublicKey = await crypto.subtle.importKey(
          "raw",
          getBytes(pub),
          "X25519",
          true,
          [],
        );
        const { enc, ct } = await suite.seal(
          { recipientPublicKey, info },
          raw,
          iv,
        );
        return join(enc, ct);
      }),
    );
    const header = join(magic, Uint8Array.of(slots.length), iv, ...slots);
    const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
      "encrypt",
    ]);
    const cipher = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: join(info, header) },
      key,
      body,
    );
    return join(header, cipher);
  } finally {
    raw.fill(0);
    body.fill(0);
  }
}
export async function openOpaque(bytes, reader, context) {
  const n = bytes[3],
    headerSize = 16 + n * slotSize,
    info = binding(context);
  if (
    !isOpaque(bytes) ||
    !n ||
    n > 32 ||
    bytes.length < headerSize + 20 ||
    bytes.length > headerSize + 16 + limit
  )
    throw Error("Invalid private packet.");
  const publicKey = await crypto.subtle.importKey(
    "raw",
    getBytes(reader.publicKey),
    "X25519",
    true,
    [],
  );
  const privateKey =
    typeof reader.privateKey === "string"
      ? await crypto.subtle.importKey(
          "pkcs8",
          getBytes(reader.privateKey),
          "X25519",
          false,
          ["deriveBits"],
        )
      : reader.privateKey;
  const iv = bytes.slice(4, 16);
  for (let i = 0; i < n; i++) {
    const start = 16 + i * slotSize;
    let raw;
    try {
      raw = new Uint8Array(
        await suite.open(
          {
            recipientKey: { privateKey, publicKey },
            info,
            enc: bytes.slice(start, start + 32),
          },
          bytes.slice(start + 32, start + slotSize),
          iv,
        ),
      );
    } catch {
      continue;
    }
    try {
      const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
        "decrypt",
      ]);
      const plain = new Uint8Array(
        await crypto.subtle.decrypt(
          {
            name: "AES-GCM",
            iv,
            additionalData: join(info, bytes.slice(0, headerSize)),
          },
          key,
          bytes.slice(headerSize),
        ),
      );
      try {
        const len = new DataView(plain.buffer).getUint32(0);
        if (len > plain.length - 4) throw Error("Invalid private packet.");
        return JSON.parse(
          new TextDecoder("utf-8", { fatal: true }).decode(
            plain.subarray(4, 4 + len),
          ),
        );
      } finally {
        plain.fill(0);
      }
    } finally {
      raw.fill(0);
    }
  }
  throw Error("No authorized reader for this packet.");
}
