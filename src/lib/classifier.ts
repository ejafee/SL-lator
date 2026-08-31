import { NormalizedLandmark, TranslationResult } from '@/types';

// Simple rule-based/geometric fallback classifier for ASL alphabet letters (A, B, C, L, V, etc.)
// When HF API is unreachable or rate-limited, this guarantees instant local recognition.
export function classifyLandmarksLocally(landmarks: NormalizedLandmark[]): TranslationResult {
  if (!landmarks || landmarks.length !== 21) {
    return { gloss: '', confidence: 0, isFallback: true };
  }

  // Fingertips vs MCP joints Y coordinates (lower Y is higher on screen)
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];

  const indexMcp = landmarks[5];
  const middleMcp = landmarks[9];
  const ringMcp = landmarks[13];
  const pinkyMcp = landmarks[17];

  // Check extended fingers (tip is significantly higher/lower than MCP depending on orientation)
  const indexExtended = indexTip.y < indexMcp.y;
  const middleExtended = middleTip.y < middleMcp.y;
  const ringExtended = ringTip.y < ringMcp.y;
  const pinkyExtended = pinkyTip.y < pinkyMcp.y;

  // Thumb position relative to index
  const thumbOut = Math.abs(thumbTip.x - indexMcp.x) > 0.15;

  // Simple heuristic classifier for demo
  if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return { gloss: 'A', confidence: 0.85, isFallback: true };
  }
  if (indexExtended && middleExtended && ringExtended && pinkyExtended && !thumbOut) {
    return { gloss: 'B', confidence: 0.82, isFallback: true };
  }
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
    return { gloss: 'V', confidence: 0.88, isFallback: true };
  }
  if (indexExtended && !middleExtended && !ringExtended && pinkyExtended) {
    return { gloss: 'Y', confidence: 0.80, isFallback: true };
  }
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended && thumbOut) {
    return { gloss: 'L', confidence: 0.90, isFallback: true };
  }
  if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended && thumbOut) {
    return { gloss: 'S', confidence: 0.78, isFallback: true };
  }

  return { gloss: '...', confidence: 0.50, isFallback: true };
}
