import { NextRequest, NextResponse } from "next/server";
import { getProfile, saveProfile } from "@/lib/profile";
import { profileCompleteness } from "@/lib/profileModel";
import { CONFIG_KEYS, getAllConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  const [profile, all] = await Promise.all([getProfile(), getAllConfig()]);
  return NextResponse.json({
    profile,
    completeness: profileCompleteness(profile),
    inMatching: all[CONFIG_KEYS.PROFILE_IN_MATCHING] !== "false",
  });
}

// PUT { profile } — the whole profile; anything malformed is repaired field by field.
export async function PUT(req: NextRequest) {
  let body: { profile?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body?.profile || typeof body.profile !== "object") {
    return NextResponse.json({ error: "profile is required" }, { status: 400 });
  }
  const profile = await saveProfile(body.profile);
  return NextResponse.json({ ok: true, profile, completeness: profileCompleteness(profile) });
}
