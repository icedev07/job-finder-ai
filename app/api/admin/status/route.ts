import { NextResponse } from "next/server";
import { getStatusSnapshot } from "@/lib/status";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getStatusSnapshot(), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "Status unavailable" }, { status: 503 });
  }
}
