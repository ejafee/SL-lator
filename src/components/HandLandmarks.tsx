"use client";

import { useEffect, useRef, useState } from "react";
import { classifyLandmarksLocally } from "@/lib/classifier";
import { NormalizedLandmark, TranslationResult } from "@/types";

interface HandLandmarksProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onResult?: (result: TranslationResult, raw: NormalizedLandmark[]) => void;
}

export function HandLandmarks({ videoRef, canvasRef, onResult }: HandLandmarksProps) {
  const [status, setStatus] = useState("Initializing...");
  const handsRef = useRef<any>(null);
  const rafId = useRef<number>(0);
  const bufferRef = useRef<NormalizedLandmark[][]>([]);

  useEffect(() => {
    let hands: any;
    let camera: any;

    async function init() {
      // @ts-ignore
      const { Hands } = await import("@mediapipe/hands");
      // @ts-ignore
      const { Camera } = await import("@mediapipe/camera_utils");
      // @ts-ignore
      const { drawConnectors, drawLandmarks, HAND_CONNECTIONS } = await import("@mediapipe/drawing_utils");

      hands = new Hands({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });

      hands.onResults((results: any) => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          for (const landmarks of results.multiHandLandmarks) {
            drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
              color: "#00FF00",
              lineWidth: 2,
            });
            drawLandmarks(ctx, landmarks, { color: "#FF0000", lineWidth: 1 });
          }
          const first = results.multiHandLandmarks[0] as NormalizedLandmark[];
          bufferRef.current.push(first);
          if (bufferRef.current.length > 30) bufferRef.current.shift();

          // Lightweight local fallback classification (fast, per-frame)
          const res = classifyLandmarksLocally(first);
          onResult?.(res, first);
          setStatus(`Detected: ${res.gloss} (${Math.round(res.confidence * 100)}%)`);
        } else {
          setStatus("Show hand to camera");
        }
        ctx.restore();
      });

      if (videoRef.current) {
        const c = new Camera(videoRef.current, {
          onFrame: async () => {
            await hands.send({ image: videoRef.current! });
          },
          width: 640,
          height: 480,
        });
        camera = c;
        camera.start();
        setStatus("Camera active");
      }

      handsRef.current = hands;
    }

    init();

    const currentRaf = rafId.current;
    return () => {
      if (hands) hands.close();
      if (camera) camera.stop?.();
      if (currentRaf) cancelAnimationFrame(currentRaf);
    };
  }, [videoRef, canvasRef, onResult]);

  return (
    <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 text-xs text-white rounded">
      {status}
    </div>
  );
}
