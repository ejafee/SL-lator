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
  const lastTranslationTime = useRef<number>(0);
  const bufferedLandmarks = useRef<NormalizedLandmark[][]>([]);

  const handleResult = useCallback(async (local: TranslationResult | null, raw: NormalizedLandmark[]) => {
    if (paused) return;

    if (raw) {
      bufferedLandmarks.current.push(raw);
      if (bufferedLandmarks.current.length > 20) bufferedLandmarks.current.shift();
    }

    if (!local) return; // Ignore ambiguous frames to prevent spam

    // Debounce translation output (e.g. only accept a sign every 1.5 seconds)
    const now = Date.now();
    if (now - lastTranslationTime.current < 1500) return;
    lastTranslationTime.current = now;

    onTranslation(local);
    onLog({ timestamp: new Date().toISOString(), ...local, landmarks: raw });
  }, [onLog, onTranslation, paused]);

  return (
    <div className="relative w-full max-w-2xl mx-auto bg-black rounded-xl overflow-hidden aspect-[4/3]">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover -scale-x-100"
        playsInline
        autoPlay
        muted
      />
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="absolute inset-0 w-full h-full object-cover -scale-x-100 pointer-events-none"
      />
      <HandLandmarks videoRef={videoRef} canvasRef={canvasRef} onResult={handleResult} />
    </div>
  );
}
