"use client";

import { useEffect, useRef, useState } from "react";
import { classifyLandmarksLocally } from "@/lib/classifier";
import { NormalizedLandmark, TranslationResult } from "@/types";

interface HandLandmarksProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  paused?: boolean;
  onResult?: (result: TranslationResult | null, raw: NormalizedLandmark[]) => void;
}

export function HandLandmarks({ videoRef, canvasRef, paused, onResult }: HandLandmarksProps) {
  const [status, setStatus] = useState("Initializing...");
  const latestResultsRef = useRef<any>(null);
  const pausedRef = useRef(paused);
  const onResultRef = useRef(onResult);

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  useEffect(() => {
    let hands: any;
    let camera: any;
    let closed = false;
    let animId = 0;
    let latestResults: any = null;

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
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      hands.onResults((results: any) => {
        latestResults = results;
        latestResultsRef.current = results;
      });

      function renderLoop() {
        if (closed) return;
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.save();
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (latestResults && latestResults.multiHandLandmarks?.length) {
              for (const landmarks of latestResults.multiHandLandmarks) {
                drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
                  color: "#00FF00",
                  lineWidth: 3,
                });
                drawLandmarks(ctx, landmarks, { color: "#FF0000", lineWidth: 2, radius: 4 });
              }

              if (!pausedRef.current) {
                const first = latestResults.multiHandLandmarks[0] as NormalizedLandmark[];
                const res = classifyLandmarksLocally(first);
                if (res) {
                  onResultRef.current?.(res, first);
                  setStatus(`Detected: ${res.gloss} (${Math.round(res.confidence * 100)}%)`);
                } else {
                  setStatus("Hand detected — unrecognized");
                }
              } else {
                setStatus("Paused");
              }
            } else {
              if (pausedRef.current) setStatus("Paused");
              else setStatus("Show hand to camera");
            }
            ctx.restore();
          }
        }
        animId = requestAnimationFrame(renderLoop);
      }
      animId = requestAnimationFrame(renderLoop);

      if (videoRef.current) {
        const c = new Camera(videoRef.current, {
          onFrame: async () => {
            if (closed || !hands || !videoRef.current) return;
            try {
              await hands.send({ image: videoRef.current });
            } catch {}
          },
          width: 640,
          height: 480,
        });
        camera = c;
        camera.start();
        setStatus("Camera active");
      }
    }

    init();

    return () => {
      closed = true;
      if (animId) cancelAnimationFrame(animId);
      if (camera) camera.stop?.();
      if (hands) try { hands.close(); } catch {}
    };
  }, [videoRef, canvasRef]);

  return (
    <div className="absolute bottom-2 left-2 z-10 bg-black/60 px-2 py-1 text-xs text-white rounded">
      {status}
    </div>
  );
}
