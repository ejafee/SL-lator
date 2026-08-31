import { NormalizedLandmark, TranslationResult } from "@/types";

// Simple geometric classifier for ASL alphabet fingerspelling
// Returns null when gesture is ambiguous (no spam)
export function classifyLandmarksLocally(landmarks: NormalizedLandmark[]): TranslationResult | null {
  if (!landmarks || landmarks.length !== 21) return null;

  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];
  const thumbTip = landmarks[4];

  const indexMcp = landmarks[5];
  const middleMcp = landmarks[9];
  const ringMcp = landmarks[13];
  const pinkyMcp = landmarks[17];
  const thumbMcp = landmarks[2];

  // In MediaPipe, y < 0.5 is upper portion. We use a relative delta instead.
  // A finger is "extended" if its tip is meaningfully higher (lower y) than its MCP.
  const up = (tipY: number, mcpY: number) => mcpY - tipY > 0.05;
  const down = (tipY: number, mcpY: number) => tipY - mcpY > 0.05;

  const indexExt = up(indexTip.y, indexMcp.y);
  const middleExt = up(middleTip.y, middleMcp.y);
  const ringExt = up(ringTip.y, ringMcp.y);
  const pinkyExt = up(pinkyTip.y, pinkyMcp.y);
  const thumbExt = Math.abs(thumbTip.x - thumbMcp.x) > 0.08;

  // Require a stable pose: most fingers clearly extended or clearly folded
  const extendedCount = [indexExt, middleExt, ringExt, pinkyExt].filter(Boolean).length;
  if (extendedCount === 0 || extendedCount === 4) {
    // Closed fist (A/S) or open hand (B). Distinguish by thumb.
    if (extendedCount === 0 && !thumbExt) return { gloss: "A", confidence: 0.9, isFallback: true };
    if (extendedCount === 0 && thumbExt) return { gloss: "S", confidence: 0.8, isFallback: true };
    if (extendedCount === 4) return { gloss: "B", confidence: 0.9, isFallback: true };
  }
  if (indexExt && middleExt && !ringExt && !pinkyExt) return { gloss: "V", confidence: 0.9, isFallback: true };
  if (indexExt && middleExt && ringExt && !pinkyExt) return { gloss: "W", confidence: 0.85, isFallback: true };
  if (indexExt && !middleExt && !ringExt && !pinkyExt && thumbExt) return { gloss: "L", confidence: 0.9, isFallback: true };
  if (indexExt && !middleExt && !ringExt && pinkyExt) return { gloss: "Y", confidence: 0.9, isFallback: true };
  if (indexExt && middleExt && ringExt && pinkyExt) return { gloss: "B", confidence: 0.85, isFallback: true };

  return null;
}
