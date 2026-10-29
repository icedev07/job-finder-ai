// Signed admin session cookie. Built on Web Crypto only, so the same code runs
// in the proxy and in route handlers.
//
// Token format: base64url(JSON payload) + "." + base64url(HMAC-SHA256(payload)).
// The signing key comes from SESSION_SECRET when set, otherwise it is derived
// from DATABASE_URL (already a server-only secret), so a deployment works
// without a new env var. Rotating SESSION_SECRET signs every session out.
//
// The payload names the user and their session version: raising the version
// on the User row (disable, new password, "sign out everywhere") ends every
// session issued before. The proxy only checks the signature and expiry; the
// pages and API routes also check the user row (lib/scope.ts).

export const SESSION_COOKIE = "jf_session";
// Set by proxy.ts on admin page requests: the path asked for, so a page that
// finds the session revoked can send the visitor back there after sign-in.
export const PATH_HEADER = "x-jf-path";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export type SessionPayload = {
  /** User id. */
  sub: number;
  /** The user's sessionVersion when the token was issued. */
  ver: number;
  /** User ID and name, to draw the shell while the database is unreachable. */
  usr: string;
  nm: string;
  iat: number;
  exp: number;
};

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

export async function createSessionToken(
  user: { id: number; sessionVersion: number; username: string; name: string },
  now = Date.now(),
): Promise<string> {
  const key = signingKey();
  if (!key) throw new Error("Cannot sign sessions: set SESSION_SECRET (or DATABASE_URL).");
  const iat = Math.floor(now / 1000);
  const payload: SessionPayload = {
    sub: user.id,
    ver: user.sessionVersion,
    usr: user.username,
    nm: user.name,
    iat,
    exp: iat + SESSION_TTL_SECONDS,
  };
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await key, encoder.encode(body)));
  return `${body}.${toBase64Url(sig)}`;
}

// The payload of a correctly signed, unexpired token; null otherwise (also for
// tokens from the single-password version, which had no user id).
// crypto.subtle.verify compares the signature in constant time.
export async function readSessionToken(
  token: string | null | undefined,
  now = Date.now(),
): Promise<SessionPayload | null> {
  if (!token) return null;
  const key = signingKey();
  if (!key) return null;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;
  const body = token.slice(0, dot);
  const sig = fromBase64Url(token.slice(dot + 1));
  if (!sig) return null;
  const valid = await crypto.subtle.verify("HMAC", await key, sig, encoder.encode(body));
  if (!valid) return null;
  const raw = fromBase64Url(body);
  if (!raw) return null;
  try {
    const p = JSON.parse(new TextDecoder().decode(raw)) as Partial<SessionPayload>;
    if (!Number.isInteger(p.sub) || !Number.isInteger(p.ver)) return null;
    if (typeof p.exp !== "number" || p.exp <= now / 1000) return null;
    return {
      sub: p.sub as number,
      ver: p.ver as number,
      usr: typeof p.usr === "string" ? p.usr : "",
      nm: typeof p.nm === "string" ? p.nm : "",
      iat: typeof p.iat === "number" ? p.iat : 0,
      exp: p.exp,
    };
  } catch {
    return null;
  }
}

export async function verifySessionToken(token: string | null | undefined, now = Date.now()): Promise<boolean> {
  return (await readSessionToken(token, now)) !== null;
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
