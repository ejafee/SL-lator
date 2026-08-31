import { NormalizedLandmark, TranslationResult } from "@/types";

export function classifyLandmarksLocally(landmarks: NormalizedLandmark[]): TranslationResult | null {
  if (!landmarks || landmarks.length !== 21) return null;

  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];

  const indexMcp = landmarks[5];
  const middleMcp = landmarks[9];
  const ringMcp = landmarks[13];
  const pinkyMcp = landmarks[17];

  // In normalized coords, y goes down (0 = top, 1 = bottom)
  // Finger extended if tip is higher than MCP (tip.y < mcp.y - margin)
  const isExt = (tipY: number, mcpY: number) => mcpY - tipY > 0.02;

  const iExt = isExt(indexTip.y, indexMcp.y);
  const mExt = isExt(middleTip.y, middleMcp.y);
  const rExt = isExt(ringTip.y, ringMcp.y);
  const pExt = isExt(pinkyTip.y, pinkyMcp.y);

  const thumbOut = Math.abs(thumbTip.x - indexMcp.x) > 0.05;

  if (iExt && mExt && rExt && pExt) return { gloss: "B", confidence: 0.9, isFallback: true };
  if (iExt && mExt && !rExt && !pExt) return { gloss: "V", confidence: 0.9, isFallback: true };
  if (iExt && !mExt && !rExt && !pExt && thumbOut) return { gloss: "L", confidence: 0.9, isFallback: true };
  if (iExt && !mExt && !rExt && pExt) return { gloss: "Y", confidence: 0.9, isFallback: true };
  if (!iExt && !mExt && !rExt && !pExt) {
    if (thumbOut) return { gloss: "S", confidence: 0.85, isFallback: true };
    return { gloss: "A", confidence: 0.85, isFallback: true };
  }

  return null;
}
