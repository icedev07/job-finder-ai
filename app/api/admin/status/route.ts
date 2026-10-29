import { NextRequest, NextResponse } from "next/server";
import { describeDbError } from "@/lib/dbErrors";
import { getStatusSnapshot } from "@/lib/status";
import { requireAdmin } from "@/lib/scope";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;
  try {
    return NextResponse.json(await getStatusSnapshot(admin.id), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    // The status strip shows this text on every admin page.
    return NextResponse.json({ error: describeDbError(e) }, { status: 503 });
  }
}
