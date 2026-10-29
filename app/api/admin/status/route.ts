import { NextRequest, NextResponse } from "next/server";
import { describeDbError } from "@/lib/dbErrors";
import { getStatusSnapshot } from "@/lib/status";
import { adminScope } from "@/lib/scope";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  try {
    return NextResponse.json(await getStatusSnapshot(scope), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    // The status strip shows this text on every admin page.
    return NextResponse.json({ error: describeDbError(e) }, { status: 503 });
  }
}
