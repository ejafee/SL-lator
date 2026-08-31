import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { LogEntry } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const entry = (await req.json()) as LogEntry;
    if (!entry || !entry.gloss) {
      return NextResponse.json({ ok: false, message: "Invalid payload" }, { status: 400 });
    }

    const logDir = process.env.LOG_DIR || "./logs";
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const dateStr = new Date().toISOString().split("T")[0];
    const filePath = path.join(logDir, `translations-${dateStr}.log`);

    const line = JSON.stringify(entry) + "\n";
    fs.appendFileSync(filePath, line, "utf-8");

    return NextResponse.json({ ok: true, file: filePath });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
