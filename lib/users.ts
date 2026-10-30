import { prisma } from "./prisma";
import { checkAgainstNothing, checkPassword, hashPassword, isDefaultPassword, passwordProblem } from "./adminAuth";

// User accounts. Each user is one job search (their own location, profile,
// settings and results). ADMIN accounts sign in to the dashboard and manage
// everyone; USER accounts only sign in to the Chrome extension. The first
// admin (lowest id) is the owner: the account an upgraded install's data went
// to, the one the old shared extension key acts for, and the one whose
// password ADMIN_PASSWORD overrides.

export type Role = "ADMIN" | "USER";

export type UserRow = {
  id: number;
  username: string;
  name: string;
  role: Role;
  active: boolean;
  sessionVersion: number;
  lastLoginAt: Date | null;
  createdAt: Date;
};

export const USER_SELECT = {
  id: true,
  username: true,
  name: true,
  role: true,
  active: true,
  sessionVersion: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

export function isRole(v: unknown): v is Role {
  return v === "ADMIN" || v === "USER";
}

/** A User row selected with USER_SELECT, with its role checked. */
export function toRow(r: { role: string } & Omit<UserRow, "role">): UserRow {
  return { ...r, role: isRole(r.role) ? r.role : "USER" };
}

// The Chrome extension signs in with the same user ID and password, getting a
// token per browser (lib/extensionTokens.ts).

// Every request needs the user list (sign-in check, the Viewing menu), so it
// is cached briefly per server instance, like the app config. A change made
// here clears it at once; other instances catch up within the TTL.
let cached: { rows: UserRow[]; expiresAt: number } | null = null;
let inflight: Promise<UserRow[]> | null = null;
const USERS_TTL_MS = 10_000;

export function invalidateUserCache(): void {
  cached = null;
  inflight = null;
}

export async function listUsers(): Promise<UserRow[]> {
  if (cached && cached.expiresAt > Date.now()) return cached.rows;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const rows = (await prisma.user.findMany({ select: USER_SELECT, orderBy: { id: "asc" } })).map(toRow);
      cached = { rows, expiresAt: Date.now() + USERS_TTL_MS };
      return rows;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

// The list a re-read found without the id asked for: that id is not looked for again until the list is replaced.
let checkedWithout: { id: number; rows: UserRow[] } | null = null;

/**
 * The user list, read again when it lacks this user: one added a moment ago through another bundle or server
 * instance, whose data the next request already asks for (Add user uploads the new user's resume right away). An
 * id that really is gone (a stale Viewing cookie) costs one re-read per cache period.
 */
export async function listUsersWith(id: number | null): Promise<UserRow[]> {
  const rows = await listUsers();
  if (id == null || rows.some((u) => u.id === id)) return rows;
  if (checkedWithout?.id === id && checkedWithout.rows === rows) return rows;
  invalidateUserCache();
  const fresh = await listUsers();
  if (!fresh.some((u) => u.id === id)) checkedWithout = { id, rows: fresh };
  return fresh;
}

export async function getUser(id: number): Promise<UserRow | null> {
  return (await listUsers()).find((u) => u.id === id) ?? null;
}

/**
 * The user straight from the database, skipping the cache. Pages and API
 * routes are separate bundles with separate caches, and Vercel runs several
 * instances, so a cache can miss a change made elsewhere for a few seconds.
 */
export async function getUserFresh(id: number): Promise<UserRow | null> {
  const row = await prisma.user.findUnique({ where: { id }, select: USER_SELECT });
  return row ? toRow(row) : null;
}

export async function ownerUser(): Promise<UserRow | null> {
  return (await listUsers()).find((u) => u.role === "ADMIN") ?? null;
}

export async function isOwner(id: number): Promise<boolean> {
  return (await ownerUser())?.id === id;
}

/** Users whose searches run: board scans, the daily cron and Sheets skip disabled ones. */
export async function activeUsers(): Promise<UserRow[]> {
  return (await listUsers()).filter((u) => u.active);
}

/** A user as the Users page shows it. */
export type UserListItem = Omit<UserRow, "sessionVersion"> & {
  /** The first admin: the account an upgraded install's data went to. */
  isOwner: boolean;
  isYou: boolean;
  /** The owner's password comes from the ADMIN_PASSWORD env var and can't be changed here. */
  passwordFromEnv: boolean;
};

export async function toListItems(users: UserRow[], meId: number): Promise<UserListItem[]> {
  const owner = await ownerUser();
  const envPassword = !!process.env.ADMIN_PASSWORD?.trim();
  return users.map(({ sessionVersion: _v, ...u }) => {
    void _v;
    const isOwner = owner?.id === u.id;
    return { ...u, isOwner, isYou: u.id === meId, passwordFromEnv: isOwner && envPassword };
  });
}

// ── Validation ──────────────────────────────────────────────────────────────

export const USERNAME_HINT = "3–32 characters: letters, digits, dot, dash or underscore.";
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;

export function normalizeUsername(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

export function usernameProblem(username: string): string | null {
  return USERNAME_RE.test(username) ? null : `The user ID must be ${USERNAME_HINT}`;
}

export function cleanName(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().replace(/\s+/g, " ").slice(0, 80) : "";
}

// ── Sign-in ─────────────────────────────────────────────────────────────────

export type LoginResult =
  | { ok: true; user: UserRow; usingDefaultPassword: boolean }
  | { ok: false; reason: "invalid" | "disabled" | "extension_only" };

/**
 * Check a user ID and password. Never says which of the two was wrong. The
 * dashboard takes admins only; the Chrome extension (`extension: true`) takes
 * every role.
 */
export async function verifyLogin(
  usernameRaw: unknown,
  password: string,
  { extension = false }: { extension?: boolean } = {},
): Promise<LoginResult> {
  const username = normalizeUsername(usernameRaw);
  const row = username
    ? await prisma.user.findUnique({ where: { username }, select: { ...USER_SELECT, passwordHash: true } })
    : null;
  if (!row) {
    await checkAgainstNothing(password);
    return { ok: false, reason: "invalid" };
  }
  const owner = (await ownerUser())?.id === row.id;
  const check = await checkPassword(password, row.passwordHash, owner);
  if (!check.ok) return { ok: false, reason: "invalid" };
  if (!row.active) return { ok: false, reason: "disabled" };
  if (!extension && row.role !== "ADMIN") return { ok: false, reason: "extension_only" };
  await prisma.user
    .update({
      where: { id: row.id },
      data: {
        lastLoginAt: new Date(),
        // Upgrade an old plain-text (or default) password to a hash.
        ...(check.needsRehash ? { passwordHash: await hashPassword(password.trim()) } : {}),
      },
    })
    .catch(() => {});
  const { passwordHash: _hash, ...user } = row;
  void _hash;
  return { ok: true, user: toRow(user), usingDefaultPassword: check.usingDefault };
}

/** Check a signed-in user's own password again (password changes, SQL console writes). */
export async function verifyOwnPassword(userId: number, password: string): Promise<boolean> {
  const row = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!row || !password) return false;
  return (await checkPassword(password, row.passwordHash, await isOwner(userId))).ok;
}

/** Whether a user's password is still the shipped default "admin". */
export async function usesDefaultPassword(userId: number): Promise<boolean> {
  const row = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!row) return false;
  return isDefaultPassword(row.passwordHash, await isOwner(userId));
}

// ── Changes ─────────────────────────────────────────────────────────────────

// A raised sessionVersion already refuses the user's extension tokens; deleting
// them also takes them off Admin → Extension. Before /api/setup has added the
// table there is nothing to delete.
async function endExtensionSignIns(userId: number): Promise<void> {
  await prisma.extensionToken.deleteMany({ where: { userId } }).catch(() => {});
}

export class UserError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "UserError";
    this.status = status;
  }
}

export async function createUser(input: {
  username: unknown;
  name: unknown;
  password: string;
  role: unknown;
}): Promise<UserRow> {
  const username = normalizeUsername(input.username);
  const problem = usernameProblem(username);
  if (problem) throw new UserError(problem);
  const name = cleanName(input.name) || username;
  const pw = passwordProblem(input.password);
  if (pw) throw new UserError(pw);
  if (!isRole(input.role)) throw new UserError("The role must be ADMIN or USER.");
  if (await prisma.user.findUnique({ where: { username }, select: { id: true } })) {
    throw new UserError(`The user ID “${username}” is taken.`, 409);
  }
  const row = await prisma.user.create({
    data: { username, name, role: input.role, passwordHash: await hashPassword(input.password.trim()) },
    select: USER_SELECT,
  });
  invalidateUserCache();
  return toRow(row);
}

async function activeAdminCount(exceptId?: number): Promise<number> {
  return (await listUsers()).filter((u) => u.role === "ADMIN" && u.active && u.id !== exceptId).length;
}

/**
 * Rename, change the role, or enable / disable a user. `actorId` is the admin
 * making the change: nobody can disable or demote themselves, and the last
 * active admin always stays, so the dashboard can never lock everyone out.
 */
export async function updateUser(
  id: number,
  patch: { name?: unknown; role?: unknown; active?: unknown },
  actorId: number,
): Promise<UserRow> {
  const user = await getUser(id);
  if (!user) throw new UserError("User not found.", 404);
  const data: { name?: string; role?: Role; active?: boolean; sessionVersion?: { increment: number } } = {};
  if (patch.name !== undefined) {
    const name = cleanName(patch.name);
    if (!name) throw new UserError("The name can't be empty.");
    data.name = name;
  }
  if (patch.role !== undefined) {
    if (!isRole(patch.role)) throw new UserError("The role must be ADMIN or USER.");
    if (patch.role !== user.role) {
      if (id === actorId) throw new UserError("You can't change your own role.");
      if (user.role === "ADMIN" && user.active && (await activeAdminCount(id)) === 0) {
        throw new UserError("Keep at least one active admin.");
      }
      data.role = patch.role;
      // Losing or gaining dashboard access starts from a fresh sign-in.
      data.sessionVersion = { increment: 1 };
    }
  }
  if (patch.active !== undefined) {
    if (typeof patch.active !== "boolean") throw new UserError("active must be true or false.");
    if (patch.active !== user.active) {
      if (!patch.active && id === actorId) throw new UserError("You can't disable yourself.");
      if (!patch.active && user.role === "ADMIN" && (await activeAdminCount(id)) === 0) {
        throw new UserError("Keep at least one active admin.");
      }
      data.active = patch.active;
      // Disabling signs them out everywhere at once.
      if (!patch.active) data.sessionVersion = { increment: 1 };
    }
  }
  const row = await prisma.user.update({ where: { id }, data, select: USER_SELECT });
  if (data.sessionVersion) await endExtensionSignIns(id);
  invalidateUserCache();
  return toRow(row);
}

/** Set a new password and sign the user out everywhere, the extension included. */
export async function setUserPassword(id: number, password: string): Promise<void> {
  const pw = passwordProblem(password);
  if (pw) throw new UserError(pw);
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(password.trim()), sessionVersion: { increment: 1 } },
  });
  await endExtensionSignIns(id);
  invalidateUserCache();
}

/** Sign a user out of every browser and the extension (their current sessions stop working). */
export async function signOutEverywhere(id: number): Promise<void> {
  await prisma.user.update({ where: { id }, data: { sessionVersion: { increment: 1 } } });
  await endExtensionSignIns(id);
  invalidateUserCache();
}

/** Delete a user with everything that is theirs: jobs, settings, resumes, answers and rules. */
export async function deleteUser(id: number, actorId: number): Promise<void> {
  const user = await getUser(id);
  if (!user) throw new UserError("User not found.", 404);
  if (id === actorId) throw new UserError("You can't delete yourself.");
  if (user.role === "ADMIN" && user.active && (await activeAdminCount(id)) === 0) {
    throw new UserError("Keep at least one active admin.");
  }
  await prisma.user.delete({ where: { id } });
  invalidateUserCache();
}
