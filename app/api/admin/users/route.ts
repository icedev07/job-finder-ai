import { NextRequest, NextResponse } from "next/server";
import { describeDbError } from "@/lib/dbErrors";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/scope";
import { UserError, createUser, deleteUser, getUser, listUsers, toListItems } from "@/lib/users";
import { USER_KEYS, copyUserSetup, setUserConfig } from "@/lib/userSettings";

export const dynamic = "force-dynamic";

// GET → every user, oldest first, with where they search and how many jobs they have.
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;
  const users = await toListItems(await listUsers(), admin.id);
  const [settings, jobs, approved] = await Promise.all([
    prisma.userConfig
      .findMany({ where: { key: { in: [USER_KEYS.CURRENT_LOCATION, USER_KEYS.TARGET_MARKET] } } })
      .catch(() => []),
    prisma.scrapedJob.groupBy({ by: ["userId"], _count: { _all: true } }).catch(() => []),
    prisma.scrapedJob.groupBy({ by: ["userId"], where: { status: "APPROVED" }, _count: { _all: true } }).catch(() => []),
  ]);
  const value = (userId: number, key: string) => settings.find((s) => s.userId === userId && s.key === key)?.value ?? "";
  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      currentLocation: value(u.id, USER_KEYS.CURRENT_LOCATION),
      targetMarket: value(u.id, USER_KEYS.TARGET_MARKET),
      jobs: jobs.find((j) => j.userId === u.id)?._count._all ?? 0,
      approved: approved.find((j) => j.userId === u.id)?._count._all ?? 0,
    })),
  });
}

type CopyParts = { search?: boolean; rules?: boolean; profile?: boolean };

// POST { username, name, password, role, currentLocation, targetMarket,
//        copyFrom?: userId, copy?: { search, rules, profile } } → add a user.
// Where they are based and their target market are required unless the search
// options are copied from another user (then they override the copied ones).
export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const text = (v: unknown) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, 300) : "");
  const currentLocation = text(body.currentLocation);
  const targetMarket = text(body.targetMarket);
  const copyFrom = body.copyFrom == null || body.copyFrom === "" ? null : Number(body.copyFrom);
  const raw = (body.copy && typeof body.copy === "object" ? body.copy : {}) as Record<string, unknown>;
  const copy: CopyParts = { search: raw.search === true, rules: raw.rules === true, profile: raw.profile === true };

  try {
    if (copyFrom != null && !(Number.isInteger(copyFrom) && (await getUser(copyFrom)))) {
      throw new UserError("The user to copy from was not found.");
    }
    const copiesSearch = copyFrom != null && copy.search;
    if (!copiesSearch && (!currentLocation || !targetMarket)) {
      throw new UserError("Say where they are based and which market they target (or copy the search options of another user).");
    }
    const user = await createUser({
      username: body.username,
      name: body.name,
      password: typeof body.password === "string" ? body.password : "",
      role: body.role,
    });
    try {
      if (copyFrom != null) await copyUserSetup(copyFrom, user.id, copy);
      const values: Record<string, string> = {};
      if (currentLocation) values[USER_KEYS.CURRENT_LOCATION] = currentLocation;
      if (targetMarket) values[USER_KEYS.TARGET_MARKET] = targetMarket;
      if (Object.keys(values).length) await setUserConfig(user.id, values);
    } catch (e) {
      // Don't leave a half-set-up account behind.
      await deleteUser(user.id, admin.id).catch(() => {});
      throw e;
    }
    return NextResponse.json({ ok: true, user: (await toListItems([user], admin.id))[0] });
  } catch (e) {
    if (e instanceof UserError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: describeDbError(e) }, { status: 500 });
  }
}
