import { NextResponse } from "next/server";
import { describeDbError } from "@/lib/dbErrors";
import { getStatusSnapshot } from "@/lib/status";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getStatusSnapshot(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    // The status strip shows this text on every admin page.
    return NextResponse.json({ error: describeDbError(e) }, { status: 503 });
  }
}
