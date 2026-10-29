import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateSkipRuleCache } from "@/lib/jobSkipRules";
import { adminOnly } from "@/lib/scope";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await adminOnly(req);
  if (denied) return denied;
  const rules = await prisma.skipRule.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const denied = await adminOnly(req);
  if (denied) return denied;
  const { type, pattern } = await req.json();
  if (!type || !pattern) {
    return NextResponse.json({ error: "type and pattern required" }, { status: 400 });
  }
  const rule = await prisma.skipRule.create({
    data: { type, pattern },
  });
  invalidateSkipRuleCache();
  return NextResponse.json(rule);
}
