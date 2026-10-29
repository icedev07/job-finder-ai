import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateSkipRuleCache } from "@/lib/jobSkipRules";
import { adminScope, viewingUserId } from "@/lib/scope";

export const dynamic = "force-dynamic";

const TYPES = new Set(["TITLE", "COMPANY", "URL"]);

// Rules of the user being viewed plus the rules for everyone (userId null);
// with all users, every rule.
export async function GET(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const userId = viewingUserId(scope);
  const rules = await prisma.skipRule.findMany({
    where: userId != null ? { OR: [{ userId }, { userId: null }] } : {},
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(rules);
}

// POST { type, pattern, everyone? } — a rule for the user being viewed, or for
// everyone (always, when viewing all users).
export async function POST(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  let body: { type?: unknown; pattern?: unknown; everyone?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const type = typeof body.type === "string" ? body.type : "";
  const pattern = typeof body.pattern === "string" ? body.pattern.trim() : "";
  if (!TYPES.has(type) || !pattern) {
    return NextResponse.json({ error: "type (TITLE, COMPANY or URL) and pattern are required" }, { status: 400 });
  }
  const viewed = viewingUserId(scope);
  const userId = body.everyone === true ? null : viewed;
  const rule = await prisma.skipRule.create({
    data: { type: type as "TITLE" | "COMPANY" | "URL", pattern: pattern.slice(0, 500), userId },
  });
  invalidateSkipRuleCache();
  return NextResponse.json(rule);
}
