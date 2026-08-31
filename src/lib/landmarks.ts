import { NormalizedLandmark } from '@/types';

/**
 * Normalizes a list of 21 3D hand landmarks relative to the wrist (landmark 0).
 * Makes features scale and translation invariant.
 */
export function normalizeLandmarks(landmarks: NormalizedLandmark[]): number[] {
  if (!landmarks || landmarks.length !== 21) {
    return [];
  }

  const wrist = landmarks[0];
  const normalized: number[] = [];

  // Calculate hand scale (distance from wrist to middle finger MCP - landmark 9)
  const middleMcp = landmarks[9];
  const dx = middleMcp.x - wrist.x;
  const dy = middleMcp.y - wrist.y;
  const dz = middleMcp.z - wrist.z;
  const scale = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1.0;

  for (const lm of landmarks) {
    // Relative to wrist, normalized by scale
    normalized.push((lm.x - wrist.x) / scale);
    normalized.push((lm.y - wrist.y) / scale);
    normalized.push((lm.z - wrist.z) / scale);
  }

  return normalized;
}

/**
 * Calculates Euclidean distance between two feature vectors
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}
