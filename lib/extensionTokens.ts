import { createHash, randomBytes } from "node:crypto";

import { prisma } from "./prisma";
import { markStatusStale } from "./statusCache";
import { toRow, type UserRow } from "./users";

// Chrome extension sign-ins. Signing in to the popup with a user ID and
// password gives that browser a random token; the server keeps only its
// SHA-256 hash, so a database leak gives nobody a working token. A token is
// refused once its user is disabled or their sessionVersion moves on (new
// password, "sign out everywhere"), and it can be signed out on its own from
// the popup or Admin → Extension.

const TOKEN_PREFIX = "jfx_";
const TOKEN_RE = /^jfx_[A-Za-z0-9_-]{43}$/;
// lastUsedAt is written at most this often, not on every LinkedIn job.
const TOUCH_EVERY_MS = 5 * 60_000;

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

// Checked in order: Edge and Opera User-Agents also say "Chrome/…".
const BROWSERS: [RegExp, string][] = [
  [/Edg\/(\d+)/, "Edge"],
  [/OPR\/(\d+)/, "Opera"],
  [/Chrome\/(\d+)/, "Chrome"],
];
const SYSTEMS: [RegExp, string][] = [
  [/Windows/, "Windows"],
  [/CrOS/, "ChromeOS"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/Android/, "Android"],
  [/Linux/, "Linux"],
];

/** "Chrome 155 on Windows" from a User-Agent; best effort. */
export function browserLabel(userAgent: string | null | undefined): string {
  const ua = userAgent || "";
  let browser = "A browser";
  for (const [re, name] of BROWSERS) {
    const version = ua.match(re)?.[1];
    if (version) {
      browser = `${name} ${version}`;
      break;
    }
  }
  const os = SYSTEMS.find(([re]) => re.test(ua))?.[1];
  return (os ? `${browser} on ${os}` : browser).slice(0, 120);
}

/** Sign a browser in: the token to hand to the extension (shown once, never stored). */
export async function createExtensionToken(user: UserRow, label: string): Promise<string> {
  const token = `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
  await prisma.extensionToken.create({
    data: { userId: user.id, tokenHash: hashToken(token), label: label.slice(0, 120), sessionVersion: user.sessionVersion },
  });
  // The Setup step and the status strip count signed-in browsers.
  markStatusStale();
  return token;
}

export type TokenCheck =
  | { ok: true; tokenId: number; user: UserRow }
  | { ok: false; reason: "unknown" | "ended" | "disabled"; user?: UserRow };

/** Whose token this is, read fresh from the database (no cache: a sign-out must count at once). */
export async function checkExtensionToken(token: string, now = new Date()): Promise<TokenCheck> {
  if (!TOKEN_RE.test(token)) return { ok: false, reason: "unknown" };
  // The token and its user in one query: the extension sends one for every LinkedIn job.
  const [row] = await prisma.$queryRaw<
    ({ tokenId: number; tokenVersion: number; lastUsedAt: Date | null } & Omit<UserRow, "role"> & { role: string })[]
  >`
    SELECT t.id AS "tokenId", t."sessionVersion" AS "tokenVersion", t."lastUsedAt",
           u.id, u.username, u.name, u.role, u.active, u."sessionVersion", u."lastLoginAt", u."createdAt"
    FROM "ExtensionToken" t JOIN "User" u ON u.id = t."userId"
    WHERE t."tokenHash" = ${hashToken(token)}
    LIMIT 1`;
  if (!row) return { ok: false, reason: "unknown" };
  const { tokenId, tokenVersion, lastUsedAt, ...fields } = row;
  const user = toRow(fields);
  if (tokenVersion !== user.sessionVersion) {
    await prisma.extensionToken.delete({ where: { id: tokenId } }).catch(() => {});
    return { ok: false, reason: "ended", user };
  }
  if (!user.active) return { ok: false, reason: "disabled", user };
  if (!lastUsedAt || now.getTime() - lastUsedAt.getTime() > TOUCH_EVERY_MS) {
    await prisma.extensionToken.update({ where: { id: tokenId }, data: { lastUsedAt: now } }).catch(() => {});
  }
  return { ok: true, tokenId, user };
}

/** Sign one browser out. Returns whether it was signed in. */
export async function revokeExtensionToken(id: number, userIds?: number[]): Promise<boolean> {
  const { count } = await prisma.extensionToken.deleteMany({
    where: { id, ...(userIds ? { userId: { in: userIds } } : {}) },
  });
  return count > 0;
}

export type ExtensionBrowser = {
  id: number;
  userId: number;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
};

/** The signed-in browsers of these users (all users when null), newest use first. */
export async function listExtensionBrowsers(userIds: number[] | null): Promise<ExtensionBrowser[]> {
  const rows = await prisma.extensionToken.findMany({
    where: userIds ? { userId: { in: userIds } } : {},
    select: { id: true, userId: true, label: true, createdAt: true, lastUsedAt: true, sessionVersion: true, user: { select: { sessionVersion: true } } },
    orderBy: [{ lastUsedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
  });
  // A token from before the user's last "sign out everywhere" no longer works.
  return rows
    .filter((r) => r.sessionVersion === r.user.sessionVersion)
    .map((r) => ({
      id: r.id,
      userId: r.userId,
      label: r.label,
      createdAt: r.createdAt.toISOString(),
      lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
    }));
}
