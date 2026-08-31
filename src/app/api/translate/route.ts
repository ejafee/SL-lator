import { NextRequest, NextResponse } from "next/server";
import { normalizeLandmarks } from "@/lib/landmarks";
import { NormalizedLandmark } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { sequence } = (await req.json()) as { sequence: NormalizedLandmark[][] };
    if (!sequence || sequence.length === 0) {
      return NextResponse.json({ gloss: "", confidence: 0, isFallback: true }, { status: 400 });
    }

    const token = process.env.HF_TOKEN;
    const model = process.env.HF_MODEL_ID || "RavenOnur/Sign-Language";

    if (!token) {
      return NextResponse.json({
        gloss: "",
        confidence: 0,
        isFallback: true,
        reason: "HF_TOKEN missing; using local fallback",
      });
    }

    // Call HuggingFace Serverless Inference API
    const hfRes = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: sequence.map(normalizeLandmarks),
      }),
    });

    if (!hfRes.ok) {
      return NextResponse.json({
        gloss: "",
        confidence: 0,
        isFallback: true,
        reason: `HF API error: ${hfRes.statusText}`,
      });
    }

    const data = await hfRes.json();
    const top = Array.isArray(data) && data[0] ? data[0] : { label: "?", score: 0.5 };

    return NextResponse.json({
      gloss: top.label || "?",
      confidence: top.score || 0.5,
      isFallback: false,
    });
  } catch (err: any) {
    return NextResponse.json({
      gloss: "",
      confidence: 0,
      isFallback: true,
      error: err.message,
    });
  }
}
