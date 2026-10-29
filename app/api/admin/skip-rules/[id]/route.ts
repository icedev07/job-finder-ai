import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateSkipRuleCache } from "@/lib/jobSkipRules";
import { adminOnly } from "@/lib/scope";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const denied = await adminOnly(req);
  if (denied) return denied;
  const id = Number((await params).id);
  const body = await req.json();
  const rule = await prisma.skipRule.update({
    where: { id },
    data: { active: body.active },
  });
  invalidateSkipRuleCache();
  return NextResponse.json(rule);
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const denied = await adminOnly(req);
  if (denied) return denied;
  const id = Number((await params).id);
  await prisma.skipRule.delete({ where: { id } });
  invalidateSkipRuleCache();
  return NextResponse.json({ ok: true });
}
