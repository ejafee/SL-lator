"use client";

import { useRef, useState, useCallback } from "react";
import { HandLandmarks } from "@/components/HandLandmarks";
import { NormalizedLandmark, TranslationResult, LogEntry } from "@/types";

interface WebcamFeedProps {
  onLog: (entry: LogEntry) => void;
  onTranslation: (t: TranslationResult) => void;
  paused?: boolean;
}

export function WebcamFeed({ onLog, onTranslation, paused }: WebcamFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastHfCall = useRef<number>(0);
  const bufferedLandmarks = useRef<NormalizedLandmark[][]>([]);

  const handleResult = useCallback(async (local: TranslationResult, raw: NormalizedLandmark[]) => {
    if (paused) return;

    bufferedLandmarks.current.push(raw);
    if (bufferedLandmarks.current.length > 16) bufferedLandmarks.current.shift();

    const now = Date.now();
    const shouldCallHf = now - lastHfCall.current > 500;

    if (shouldCallHf && bufferedLandmarks.current.length >= 8) {
      lastHfCall.current = now;
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sequence: bufferedLandmarks.current }),
        });
        if (res.ok) {
          const data = (await res.json()) as TranslationResult;
          const merged: TranslationResult = {
            gloss: data.gloss || local.gloss,
            confidence: data.confidence ?? local.confidence,
            isFallback: data.isFallback,
          };
          onTranslation(merged);
          onLog({ timestamp: new Date().toISOString(), ...merged, landmarks: raw });
          return;
        }
      } catch {}
    }

    onTranslation(local);
    onLog({ timestamp: new Date().toISOString(), ...local, landmarks: raw });
  }, [onLog, onTranslation, paused]);

  return (
    <div className="relative w-full max-w-2xl mx-auto bg-black rounded-xl overflow-hidden aspect-[4/3]">
      <video ref={videoRef} className="hidden" playsInline autoPlay muted />
      <canvas ref={canvasRef} width={640} height={480} className="w-full h-full object-cover" />
      <HandLandmarks videoRef={videoRef} canvasRef={canvasRef} onResult={handleResult} />
    </div>
  );
}
