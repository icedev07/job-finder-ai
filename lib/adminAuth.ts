import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

// Password hashing, password checks and the login throttle (Node runtime only).
//
// Passwords are stored on the User row as scrypt hashes ("scrypt$<salt>$<hash>").
// The first admin of an install upgraded from the single-password version may
// still hold the old value: plain text, upgraded to a hash on the first
// successful sign-in, or empty, which means the shipped default "admin". The
// ADMIN_PASSWORD env var, when set, is the first admin's password and
// overrides the stored one (handy when you are locked out).

export const DEFAULT_ADMIN_PASSWORD = "admin";
export const MIN_PASSWORD_LENGTH = 8;
const HASH_PREFIX = "scrypt$";
const KEY_LENGTH = 32;

function scrypt(password: string, salt: Uint8Array, length: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, length, (err, key) => (err ? reject(err) : resolve(new Uint8Array(key))));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(randomBytes(16));
  const hash = await scrypt(password, salt, KEY_LENGTH);
  return `${HASH_PREFIX}${Buffer.from(salt).toString("base64")}$${Buffer.from(hash).toString("base64")}`;
}

export function isPasswordHash(value: string): boolean {
  return value.startsWith(HASH_PREFIX);
}

// Constant-time string comparison: hashing both sides first makes the buffers
// the same length, which timingSafeEqual requires.
export function safeEqual(a: string, b: string): boolean {
  const ha = new Uint8Array(createHash("sha256").update(a, "utf8").digest());
  const hb = new Uint8Array(createHash("sha256").update(b, "utf8").digest());
  return timingSafeEqual(ha, hb);
}

// An empty stored value is the shipped default, and only for the first admin.
async function matchesStored(given: string, stored: string, isOwner: boolean): Promise<boolean> {
  if (!stored) return isOwner && safeEqual(given, DEFAULT_ADMIN_PASSWORD);
  if (!isPasswordHash(stored)) return safeEqual(given, stored);
  const [, saltB64, hashB64] = stored.split("$");
  const expected = new Uint8Array(Buffer.from(hashB64 || "", "base64"));
  if (!saltB64 || expected.length === 0) return false;
  const actual = await scrypt(given, new Uint8Array(Buffer.from(saltB64, "base64")), expected.length);
  return timingSafeEqual(actual, expected);
}

export type PasswordCheck = {
  ok: boolean;
  /** True when the password that matched is still the shipped default "admin". */
  usingDefault: boolean;
  /** The stored value is not a hash yet: save hashPassword(given) after a match. */
  needsRehash: boolean;
};

/**
 * Check a password against a user's stored value. `isOwner` marks the first
 * admin, whose password the ADMIN_PASSWORD env var overrides.
 */
export async function checkPassword(givenRaw: string, stored: string, isOwner: boolean): Promise<PasswordCheck> {
  const given = givenRaw.trim();
  const envPassword = isOwner ? process.env.ADMIN_PASSWORD?.trim() : "";
  if (envPassword) {
    const ok = safeEqual(given, envPassword);
    return { ok, usingDefault: ok && envPassword === DEFAULT_ADMIN_PASSWORD, needsRehash: false };
  }
  const value = stored.trim();
  const ok = await matchesStored(given, value, isOwner);
  return { ok, usingDefault: ok && given === DEFAULT_ADMIN_PASSWORD, needsRehash: ok && !isPasswordHash(value) };
}

/** Whether a stored password (or the env override for the first admin) is still the shipped default. */
export async function isDefaultPassword(stored: string, isOwner: boolean): Promise<boolean> {
  const envPassword = isOwner ? process.env.ADMIN_PASSWORD?.trim() : "";
  if (envPassword) return envPassword === DEFAULT_ADMIN_PASSWORD;
  return matchesStored(DEFAULT_ADMIN_PASSWORD, stored.trim(), isOwner);
}

let dummyHash: Promise<string> | null = null;

/** Spend the same time as a real check, so an unknown user ID is not quicker to spot. */
export async function checkAgainstNothing(given: string): Promise<void> {
  dummyHash ??= hashPassword(randomBytes(12).toString("hex"));
  await checkPassword(given, await dummyHash, false);
}

export function passwordProblem(password: string): string | null {
  if (password.trim().length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password.length > 200) return "Use at most 200 characters.";
  return null;
}

// ── Login throttle ───────────────────────────────────────────────────────────
// Best effort on serverless (state lives as long as the warm instance), but it
// still slows down a password-guessing loop considerably.
const FAILURE_WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 8;
const failures = new Map<string, { count: number; resetAt: number }>();

export function loginBlockedForMs(clientId: string, now = Date.now()): number {
  const entry = failures.get(clientId);
  if (!entry || entry.resetAt <= now) return 0;
  return entry.count >= MAX_FAILURES ? entry.resetAt - now : 0;
}

export function recordLoginFailure(clientId: string, now = Date.now()): void {
  const entry = failures.get(clientId);
  if (!entry || entry.resetAt <= now) {
    failures.set(clientId, { count: 1, resetAt: now + FAILURE_WINDOW_MS });
    return;
  }
  entry.count += 1;
}

export function clearLoginFailures(clientId: string): void {
  failures.delete(clientId);
}

export function clientIdFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "unknown";
}
