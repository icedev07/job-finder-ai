import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateSkipRuleCache } from "@/lib/jobSkipRules";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const id = Number((await params).id);
  const body = await req.json();
  const rule = await prisma.skipRule.update({
    where: { id },
    data: { active: body.active },
  });
  invalidateSkipRuleCache();
  return NextResponse.json(rule);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const id = Number((await params).id);
  await prisma.skipRule.delete({ where: { id } });
  invalidateSkipRuleCache();
  return NextResponse.json({ ok: true });
}
