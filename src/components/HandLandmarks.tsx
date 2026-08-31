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
  const initialized = useRef(false);
  const bufferRef = useRef<NormalizedLandmark[][]>([]);

  useEffect(() => {
    let hands: any;
    let camera: any;
    let closed = false;
    let animId: number;

    async function init() {
      if (initialized.current) return;
      initialized.current = true;

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

      let latestResults: any = null;

      hands.onResults((results: any) => {
        latestResults = results;
      });

      if (videoRef.current) {
        camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (closed || !hands || !videoRef.current) return;
            try {
              await hands.send({ image: videoRef.current });
            } catch (e) {
              // ignore
            }
          },
          width: 640,
          height: 480,
        });
        camera.start();
        setStatus("Camera active");
      }

      // Transparent canvas overlay render loop (video is displayed via native <video> tag)
      function renderLoop() {
        if (closed) return;
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.save();
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (latestResults && latestResults.multiHandLandmarks && latestResults.multiHandLandmarks.length > 0) {
              for (const landmarks of latestResults.multiHandLandmarks) {
                drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
                  color: "#00FF00",
                  lineWidth: 3,
                });
                drawLandmarks(ctx, landmarks, { color: "#FF0000", lineWidth: 2 });
              }
              const first = latestResults.multiHandLandmarks[0] as NormalizedLandmark[];
              bufferRef.current.push(first);
              if (bufferRef.current.length > 30) bufferRef.current.shift();

              const res = classifyLandmarksLocally(first);
              onResult?.(res, first);
              setStatus(`Detected: ${res.gloss} (${Math.round(res.confidence * 100)}%)`);
            } else {
              setStatus("Show hand to camera");
            }
            ctx.restore();
          }
        }
        animId = requestAnimationFrame(renderLoop);
      }
      animId = requestAnimationFrame(renderLoop);

      return () => {
        closed = true;
        cancelAnimationFrame(animId);
        if (camera) camera.stop?.();
        if (hands) try { hands.close(); } catch {}
      };
    }

    init();

    return () => {
      closed = true;
      if (animId) cancelAnimationFrame(animId);
      if (camera) camera.stop?.();
      if (hands) try { hands.close(); } catch {}
    };
  }, [videoRef, canvasRef, onResult]);

  return (
    <div className="absolute bottom-2 left-2 z-10 bg-black/60 px-2 py-1 text-xs text-white rounded">
      {status}
    </div>
  );
}
