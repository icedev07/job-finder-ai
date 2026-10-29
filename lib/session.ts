// Signed admin session cookie. Built on Web Crypto only, so the same code runs
// in middleware (Edge runtime) and in route handlers (Node runtime).
//
// Token format: base64url(JSON payload) + "." + base64url(HMAC-SHA256(payload)).
// The signing key comes from SESSION_SECRET when set, otherwise it is derived
// from DATABASE_URL (already a server-only secret), so a deployment works
// without a new env var. Rotating SESSION_SECRET signs every session out.

export const SESSION_COOKIE = "jf_session";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

type SessionPayload = { sub: "admin"; iat: number; exp: number };

const encoder = new TextEncoder();

function secretMaterial(): string {
  const explicit = process.env.SESSION_SECRET?.trim();
  if (explicit) return `secret:${explicit}`;
  const db = process.env.DATABASE_URL?.trim();
  if (db) return `derived:${db}`;
  return "";
}

let cachedKey: { material: string; key: Promise<CryptoKey> } | null = null;

// A dedicated HMAC key derived from the secret material, so the raw
// DATABASE_URL never signs anything directly.
function signingKey(): Promise<CryptoKey> | null {
  const material = secretMaterial();
  if (!material) return null;
  if (cachedKey && cachedKey.material === material) return cachedKey.key;
  const key = (async () => {
    const base = await crypto.subtle.importKey(
      "raw",
      encoder.encode(material),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const derived = await crypto.subtle.sign("HMAC", base, encoder.encode("job-finder-admin-session-v1"));
    return crypto.subtle.importKey("raw", derived, { name: "HMAC", hash: "SHA-256" }, false, [
      "sign",
      "verify",
    ]);
  })();
  cachedKey = { material, key };
  return key;
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  const pad = text.length % 4 === 0 ? "" : "=".repeat(4 - (text.length % 4));
  try {
    const bin = atob(text.replace(/-/g, "+").replace(/_/g, "/") + pad);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

export function sessionSigningAvailable(): boolean {
  return secretMaterial().length > 0;
}

export async function createSessionToken(now = Date.now()): Promise<string> {
  const key = signingKey();
  if (!key) throw new Error("Cannot sign sessions: set SESSION_SECRET (or DATABASE_URL).");
  const iat = Math.floor(now / 1000);
  const payload: SessionPayload = { sub: "admin", iat, exp: iat + SESSION_TTL_SECONDS };
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await key, encoder.encode(body)));
  return `${body}.${toBase64Url(sig)}`;
}

// crypto.subtle.verify compares the signature in constant time.
export async function verifySessionToken(
  token: string | null | undefined,
  now = Date.now(),
): Promise<boolean> {
  if (!token) return false;
  const key = signingKey();
  if (!key) return false;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return false;
  const body = token.slice(0, dot);
  const sig = fromBase64Url(token.slice(dot + 1));
  if (!sig) return false;
  const valid = await crypto.subtle.verify("HMAC", await key, sig, encoder.encode(body));
  if (!valid) return false;
  const raw = fromBase64Url(body);
  if (!raw) return false;
  try {
    const payload = JSON.parse(new TextDecoder().decode(raw)) as Partial<SessionPayload>;
    return payload.sub === "admin" && typeof payload.exp === "number" && payload.exp > now / 1000;
  } catch {
    return false;
  }
}

export function sessionCookieOptions(maxAgeSeconds = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    // Lax keeps the cookie off cross-site POST/PUT/DELETE requests, which is
    // what protects the admin API from CSRF.
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
