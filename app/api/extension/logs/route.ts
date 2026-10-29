import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extensionCorsHeaders, requireExtensionUser } from "@/lib/extensionAuth";

export const dynamic = "force-dynamic";

const CORS = extensionCorsHeaders("POST, OPTIONS");

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  const auth = await requireExtensionUser(req, CORS);
  if (auth instanceof NextResponse) return auth;
  const userId = auth.user.id;

  let body: { logs?: unknown; sessionId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: CORS });
  }
  const { logs, sessionId } = body;

  if (!Array.isArray(logs) || logs.length === 0) {
    return NextResponse.json({ error: "logs[] required" }, { status: 400, headers: CORS });
  }

  const data = logs.slice(0, 500).map((entry: any) => {
    const ts = entry?.timestamp ? new Date(entry.timestamp) : new Date();
    return {
      userId,
      level: String(entry?.level || "info").substring(0, 20),
      message: String(entry?.message || "").substring(0, 2000),
      sessionId: sessionId ? String(sessionId).substring(0, 100) : null,
      createdAt: Number.isNaN(ts.getTime()) ? new Date() : ts,
    };
  });

  try {
    await prisma.extensionLog.createMany({ data });
    return NextResponse.json({ saved: data.length }, { headers: CORS });
  } catch (error: any) {
    if (error.message?.includes("ExtensionLog")) {
      return NextResponse.json({ error: "ExtensionLog table not found. Run /api/setup first." }, { status: 500, headers: CORS });
    }
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });
  }
}
