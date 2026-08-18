// 公开轻量探针:compose healthcheck 与外部拨测用(design/07)。
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { APP_VERSION } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    db.get(sql`SELECT 1`);
    return NextResponse.json({ ok: true, version: APP_VERSION });
  } catch {
    return NextResponse.json({ ok: false, version: APP_VERSION }, { status: 503 });
  }
}
