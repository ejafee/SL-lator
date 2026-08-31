import { NormalizedLandmark, TranslationResult } from "@/types";

// Distance helper
function dist(a: NormalizedLandmark, b: NormalizedLandmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z || 0) - (b.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Check if finger is extended by comparing Tip-MCP distance vs PIP-MCP distance
function isFingerExtended(lm: NormalizedLandmark[], tipIdx: number, pipIdx: number, mcpIdx: number): boolean {
  const mcpToTip = dist(lm[mcpIdx], lm[tipIdx]);
  const mcpToPip = dist(lm[mcpIdx], lm[pipIdx]);
  return mcpToTip > mcpToPip * 1.3;
}

// Finger flex ratio (0 = fully curled, 1 = fully extended)
function fingerExtensionRatio(lm: NormalizedLandmark[], tipIdx: number, mcpIdx: number, wristIdx: number): number {
  const wristToTip = dist(lm[wristIdx], lm[tipIdx]);
  const wristToMcp = dist(lm[wristIdx], lm[mcpIdx]);
  return wristToTip / (wristToMcp + 1e-6);
}

export function classifyLandmarksLocally(lm: NormalizedLandmark[]): TranslationResult | null {
  if (!lm || lm.length !== 21) return null;

  const wrist = lm[0];
  const thumbTip = lm[4], thumbPip = lm[3], thumbMcp = lm[2];
  const indexTip = lm[8], indexPip = lm[6], indexMcp = lm[5];
  const middleTip = lm[12], middlePip = lm[10], middleMcp = lm[9];
  const ringTip = lm[16], ringPip = lm[14], ringMcp = lm[13];
  const pinkyTip = lm[20], pinkyPip = lm[18], pinkyMcp = lm[17];

  const iExt = isFingerExtended(lm, 8, 6, 5);
  const mExt = isFingerExtended(lm, 12, 10, 9);
  const rExt = isFingerExtended(lm, 16, 14, 13);
  const pExt = isFingerExtended(lm, 20, 18, 17);

  // Distances between fingertips
  const indexMiddleDist = dist(indexTip, middleTip);
  const thumbIndexDist = dist(thumbTip, indexTip);
  const thumbMiddleDist = dist(thumbTip, middleTip);
  const indexMcpDist = dist(indexTip, indexMcp);

  // 1. Pointing signs (1 extended finger)
  if (iExt && !mExt && !rExt && !pExt) {
    const thumbSide = dist(thumbTip, indexMcp) > 0.1;
    if (thumbSide) return { gloss: "L", confidence: 0.92, isFallback: true };
    if (indexTip.y > indexMcp.y) return { gloss: "Q", confidence: 0.85, isFallback: true };
    return { gloss: "D", confidence: 0.88, isFallback: true }; // or I / D
  }

  if (!iExt && !mExt && !rExt && pExt) {
    if (dist(thumbTip, indexMcp) > 0.12) return { gloss: "Y", confidence: 0.92, isFallback: true };
    return { gloss: "I", confidence: 0.88, isFallback: true };
  }

  // 2. Two extended fingers (V, U, W, K, H)
  if (iExt && mExt && !rExt && !pExt) {
    if (indexMiddleDist < 0.05) return { gloss: "U", confidence: 0.90, isFallback: true };
    if (thumbMiddleDist < 0.06) return { gloss: "K", confidence: 0.88, isFallback: true };
    return { gloss: "V", confidence: 0.92, isFallback: true };
  }

  // 3. Three extended fingers (W, F)
  if (iExt && mExt && rExt && !pExt) {
    return { gloss: "W", confidence: 0.90, isFallback: true };
  }
  if (!iExt && mExt && rExt && pExt) {
    if (thumbIndexDist < 0.06) return { gloss: "F", confidence: 0.90, isFallback: true };
  }

  // 4. Four extended fingers / Full hand (B, 4)
  if (iExt && mExt && rExt && pExt) {
    const thumbTucked = dist(thumbTip, pinkyMcp) < 0.12;
    if (thumbTucked) return { gloss: "B", confidence: 0.92, isFallback: true };
    return { gloss: "OPEN", confidence: 0.80, isFallback: true };
  }

  // 5. Fist / Closed shapes (A, S, E, C, O, M, N, T)
  if (!iExt && !mExt && !rExt && !pExt) {
    if (thumbIndexDist < 0.05 && thumbMiddleDist < 0.05) return { gloss: "O", confidence: 0.88, isFallback: true };
    
    // Curved fingers (C shape)
    const iRatio = fingerExtensionRatio(lm, 8, 5, 0);
    if (iRatio > 1.2 && iRatio < 1.6) return { gloss: "C", confidence: 0.85, isFallback: true };

    // Fist variants: Thumb position determines A vs S vs E
    const thumbHigh = thumbTip.y < indexPip.y;
    const thumbAcross = thumbTip.x > indexPip.x && thumbTip.x < ringPip.x;

    if (thumbAcross) return { gloss: "S", confidence: 0.88, isFallback: true };
    if (thumbHigh) return { gloss: "A", confidence: 0.90, isFallback: true };
    return { gloss: "E", confidence: 0.82, isFallback: true };
  }

  return null;
}
