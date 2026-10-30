import { NextRequest, NextResponse } from "next/server";
import { listNextActions, markFollowedUp, nextActionCounts, undoFollowedUp } from "@/lib/nextActions";
import { adminActor, adminScope, scopedUsers, userWhere } from "@/lib/scope";

export const dynamic = "force-dynamic";

// Next actions of the user being viewed (or of every user with Applications on).
//
// GET ?only=<userId> → { items: [{ kind, dueAt, job, interview, lastInterview }],
//   total, users: [{ id, on, count }] }
// POST { action: "followed_up", ids } → { ok, updated, days, at }: on the
//   timeline, with the next reminder each user's follow-up days from now.
// POST { action: "undo_followed_up", ids, at } → { ok, undone }.

export async function GET(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  const users = await scopedUsers(scope);
  const on = users.filter((u) => u.settings.applicationsEnabled);
  const only = Number(new URL(req.url).searchParams.get("only"));
  const shown = on.some((u) => u.id === only) ? on.filter((u) => u.id === only) : on;
  const now = new Date();
  const [{ items, total }, counts] = await Promise.all([listNextActions(shown, now), nextActionCounts(on, now)]);
  return NextResponse.json({
    items,
    total,
    users: users.map((u) => ({ id: u.id, on: u.settings.applicationsEnabled, count: counts.get(u.id) ?? 0 })),
  });
}

export async function POST(req: NextRequest) {
  const scope = await adminScope(req);
  if (scope instanceof NextResponse) return scope;
  let body: { action?: unknown; ids?: unknown; at?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const ids = Array.isArray(body?.ids) ? body.ids.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
  if (!ids.length) return NextResponse.json({ error: "ids[] is required" }, { status: 400 });

  if (body.action === "followed_up") {
    const now = new Date();
    const r = await markFollowedUp(ids, { scope: userWhere(scope), actor: adminActor(scope), now });
    return NextResponse.json({ ok: true, ...r, at: now.toISOString() });
  }
  if (body.action === "undo_followed_up") {
    const at = typeof body.at === "string" ? new Date(body.at) : null;
    if (!at || Number.isNaN(at.getTime())) return NextResponse.json({ error: "at is required" }, { status: 400 });
    return NextResponse.json({ ok: true, undone: await undoFollowedUp(ids, at, userWhere(scope)) });
  }
  return NextResponse.json({ error: 'action must be "followed_up" or "undo_followed_up"' }, { status: 400 });
}
