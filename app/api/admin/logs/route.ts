import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminScope, userWhere, viewingUserId } from "@/lib/scope";

export const dynamic = "force-dynamic";

// Logs of the user being viewed (or of every user).
export async function GET(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const mine = userWhere(scope);
  const userId = viewingUserId(scope);
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const dateFilter: Record<string, any> = {};
  if (from) dateFilter.gte = new Date(from);
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    dateFilter.lte = toDate;
  }
  const createdAtWhere = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

  if (type === "analysis") {
    const logs = await prisma.analysisLog.findMany({
      where: { ...createdAtWhere, ...(userId != null ? { scrapedJob: { userId } } : {}) },
      orderBy: { createdAt: "desc" },
      take: 500,
      include: { scrapedJob: { select: { title: true, company: true, url: true, platform: true } } },
    });
    return NextResponse.json(logs);
  }

  if (type === "jobs") {
    const platform = url.searchParams.get("platform");
    const status = url.searchParams.get("status");
    const where: Record<string, any> = { ...createdAtWhere, ...mine };
    if (platform) where.platform = platform;
    if (status) where.status = status.toUpperCase();

    const jobs = await prisma.scrapedJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return NextResponse.json(jobs);
  }

  if (type === "extension") {
    const sessionId = url.searchParams.get("sessionId");
    const where: Record<string, any> = { ...createdAtWhere, ...mine };
    if (sessionId) where.sessionId = sessionId;

    try {
      const logs = await prisma.extensionLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 500,
      });
      return NextResponse.json(logs);
    } catch {
      return NextResponse.json([]);
    }
  }

  const logs = await prisma.scanLog.findMany({
    where: { ...createdAtWhere, ...mine },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json(logs);
}

// Deletes only rows of the user being viewed (any user's with all users).
export async function DELETE(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const mine = userWhere(scope);
  const userId = viewingUserId(scope);
  const body = await req.json();
  const { type, ids } = body;

  // The old one-click "cleanup" (delete every job and log) moved to
  // Admin → Data → Danger zone, which needs a typed confirmation.
  if (type === "cleanup") {
    return NextResponse.json(
      { error: "Use Admin → Data → Danger zone to delete all jobs." },
      { status: 410 },
    );
  }

  if (!type || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "type and ids[] required" }, { status: 400 });
  }

  if (type === "jobs") {
    // Their analysis logs go with them (ON DELETE CASCADE).
    const r = await prisma.scrapedJob.deleteMany({ where: { id: { in: ids }, ...mine } });
    return NextResponse.json({ deleted: r.count });
  }

  if (type === "analysis") {
    const r = await prisma.analysisLog.deleteMany({
      where: { id: { in: ids }, ...(userId != null ? { scrapedJob: { userId } } : {}) },
    });
    return NextResponse.json({ deleted: r.count });
  }

  if (type === "scans") {
    const r = await prisma.scanLog.deleteMany({ where: { id: { in: ids }, ...mine } });
    return NextResponse.json({ deleted: r.count });
  }

  if (type === "extension") {
    const r = await prisma.extensionLog.deleteMany({ where: { id: { in: ids }, ...mine } });
    return NextResponse.json({ deleted: r.count });
  }

  return NextResponse.json({ error: "invalid type" }, { status: 400 });
}
