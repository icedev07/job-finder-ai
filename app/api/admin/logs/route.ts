import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminOnly } from "@/lib/scope";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await adminOnly(req);
  if (denied) return denied;
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
      where: { ...createdAtWhere },
      orderBy: { createdAt: "desc" },
      take: 500,
      include: { scrapedJob: { select: { title: true, company: true, url: true, platform: true } } },
    });
    return NextResponse.json(logs);
  }

  if (type === "jobs") {
    const platform = url.searchParams.get("platform");
    const status = url.searchParams.get("status");
    const where: Record<string, any> = { ...createdAtWhere };
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
    const where: Record<string, any> = { ...createdAtWhere };
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
    where: { ...createdAtWhere },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json(logs);
}

export async function DELETE(req: NextRequest) {
  const denied = await adminOnly(req);
  if (denied) return denied;
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
    await prisma.analysisLog.deleteMany({ where: { scrapedJobId: { in: ids } } });
    await prisma.scrapedJob.deleteMany({ where: { id: { in: ids } } });
    return NextResponse.json({ deleted: ids.length });
  }

  if (type === "analysis") {
    await prisma.analysisLog.deleteMany({ where: { id: { in: ids } } });
    return NextResponse.json({ deleted: ids.length });
  }

  if (type === "scans") {
    await prisma.scanLog.deleteMany({ where: { id: { in: ids } } });
    return NextResponse.json({ deleted: ids.length });
  }

  if (type === "extension") {
    await prisma.extensionLog.deleteMany({ where: { id: { in: ids } } });
    return NextResponse.json({ deleted: ids.length });
  }

  return NextResponse.json({ error: "invalid type" }, { status: 400 });
}
