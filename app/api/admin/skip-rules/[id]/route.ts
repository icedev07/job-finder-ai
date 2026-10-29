import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateSkipRuleCache } from "@/lib/jobSkipRules";
import { adminScope, viewingUserId, type AdminScope } from "@/lib/scope";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// A rule of the user being viewed, or one for everyone; with all users, any rule.
function ruleWhere(id: number, scope: AdminScope) {
  const userId = viewingUserId(scope);
  return userId != null ? { id, OR: [{ userId }, { userId: null }] } : { id };
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  let body: { active?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body.active !== "boolean") return NextResponse.json({ error: "active must be true or false" }, { status: 400 });
  const { count } = await prisma.skipRule.updateMany({ where: ruleWhere(id, scope), data: { active: body.active } });
  if (!count) return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  invalidateSkipRuleCache();
  return NextResponse.json(await prisma.skipRule.findUnique({ where: { id } }));
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const { count } = await prisma.skipRule.deleteMany({ where: ruleWhere(id, scope) });
  if (!count) return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  invalidateSkipRuleCache();
  return NextResponse.json({ ok: true });
}
