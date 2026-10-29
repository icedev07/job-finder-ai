import { NextRequest, NextResponse } from "next/server";
import { getProfile, saveProfile } from "@/lib/profile";
import { profileCompleteness } from "@/lib/profileModel";
import { adminScope, requireOneUser } from "@/lib/scope";
import { getUserSettings } from "@/lib/userSettings";

export const dynamic = "force-dynamic";

// The profile of the user being viewed.
export async function GET(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const userId = requireOneUser(scope);
  if (userId instanceof NextResponse) return userId;
  const [profile, settings] = await Promise.all([getProfile(userId), getUserSettings(userId)]);
  return NextResponse.json({
    profile,
    completeness: profileCompleteness(profile),
    inMatching: settings.profileInMatching,
  });
}

// PUT { profile } — the whole profile; anything malformed is repaired field by field.
export async function PUT(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const userId = requireOneUser(scope);
  if (userId instanceof NextResponse) return userId;
  let body: { profile?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body?.profile || typeof body.profile !== "object") {
    return NextResponse.json({ error: "profile is required" }, { status: 400 });
  }
  const profile = await saveProfile(userId, body.profile);
  return NextResponse.json({ ok: true, profile, completeness: profileCompleteness(profile) });
}
