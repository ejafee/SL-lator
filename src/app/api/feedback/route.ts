import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { correction, logs } = body as { correction: string; logs: unknown[] };
    if (!correction) return NextResponse.json({ ok: false }, { status: 400 });
    const dir = process.env.LOG_DIR || "./logs";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const fp = path.join(dir, `feedback-${new Date().toISOString().split("T")[0]}.log`);
    fs.appendFileSync(fp, JSON.stringify({ ts: new Date().toISOString(), correction, logs }) + "\n", "utf-8");
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
