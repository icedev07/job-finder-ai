import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { CONFIG_KEYS, getAllConfig, setConfigValue } from "./config";

// Admin password handling (Node runtime only).
//
// The password lives in AppConfig.admin_password as an scrypt hash
// ("scrypt$<salt>$<hash>"). Deployments from before hashing stored it in plain
// text; such a value still works and is upgraded to a hash on the first
// successful login. The ADMIN_PASSWORD env var, when set, overrides the stored
// value (handy when the database is empty).

export const DEFAULT_ADMIN_PASSWORD = "admin";
export const MIN_ADMIN_PASSWORD_LENGTH = 8;
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

async function matchesStored(given: string, stored: string): Promise<boolean> {
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
};

export async function verifyAdminPassword(givenRaw: string): Promise<PasswordCheck> {
  const given = givenRaw.trim();
  const envPassword = process.env.ADMIN_PASSWORD?.trim();
  if (envPassword) {
    const ok = safeEqual(given, envPassword);
    return { ok, usingDefault: ok && envPassword === DEFAULT_ADMIN_PASSWORD };
  }

  const all = await getAllConfig();
  const stored = all[CONFIG_KEYS.ADMIN_PASSWORD]?.trim() || "";
  if (!stored) {
    const ok = safeEqual(given, DEFAULT_ADMIN_PASSWORD);
    return { ok, usingDefault: ok };
  }

  const ok = await matchesStored(given, stored);
  if (ok && !isPasswordHash(stored)) {
    // Upgrade a plain-text password to a hash the first time it is used.
    await setConfigValue(CONFIG_KEYS.ADMIN_PASSWORD, await hashPassword(given)).catch(() => {});
  }
  return { ok, usingDefault: ok && given === DEFAULT_ADMIN_PASSWORD };
}

// Whether the active admin password is still the shipped default. Used for the
// "change the default password" warning.
export async function isDefaultPasswordActive(): Promise<boolean> {
  const envPassword = process.env.ADMIN_PASSWORD?.trim();
  if (envPassword) return envPassword === DEFAULT_ADMIN_PASSWORD;
  const all = await getAllConfig();
  const stored = all[CONFIG_KEYS.ADMIN_PASSWORD]?.trim() || "";
  if (!stored) return true;
  return matchesStored(DEFAULT_ADMIN_PASSWORD, stored);
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
