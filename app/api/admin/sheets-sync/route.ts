import { NextRequest, NextResponse } from "next/server";
import { fullSyncToSheet } from "@/lib/googleSheetsSync";
import { adminOnly } from "@/lib/scope";

export async function POST(req: NextRequest) {
  const denied = await adminOnly(req);
  if (denied) return denied;
  try {
    const result = await fullSyncToSheet();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
