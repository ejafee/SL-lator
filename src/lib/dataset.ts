import { cachePrecollectedDataset, getCachedDataset } from "@/lib/indexeddb";

/**
 * Returns normalized 63-dim feature vector for a labeled ASL sign
 * Uses synthetic landmark patterns seeded from geometric rules.
 * In production, this would load pre-collected WLASL keypoint data.
 */

const ALPHABET = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y"];

function buildSyntheticLandmarks(label: string, noise: number = 0.05): number[][] {
  // 21 landmarks x 3 coordinates
  const points: number[][] = [];
  for (let i = 0; i < 21; i++) points.push([0, 0, 0]);

  // Wrist + palm base
  points[0] = [0, 0, 0]; // WRIST
  points[1] = [0.05, 0.05, 0]; // THUMB_CMC
  points[2] = [0.08, 0.1, 0]; // THUMB_MCP
  points[3] = [0.1, 0.15, 0]; // THUMB_IP
  points[4] = [0.12, 0.2, 0]; // THUMB_TIP

  const isExt = (i: number) => {
    // [index, middle, ring, pinky] mcp indices: 5, 9, 13, 17 ; tips: 8, 12, 16, 20
    const extMap: Record<string, number[]> = {
      B: [0, 1, 2, 3], V: [0, 1], W: [0, 1, 2], I: [3], Y: [0, 3],
      L: [0], U: [0, 1], K: [0, 1], D: [0], F: [1, 2, 3],
    };
    const arr = extMap[label] || [];
    return arr.includes(i);
  };

  const fingers = [
    { mcp: 5, pip: 6, dip: 7, tip: 8 },
    { mcp: 9, pip: 10, dip: 11, tip: 12 },
    { mcp: 13, pip: 14, dip: 15, tip: 16 },
    { mcp: 17, pip: 18, dip: 19, tip: 20 },
  ];

  for (let f = 0; f < 4; f++) {
    const fd = fingers[f];
    const ext = isExt(f);
    const extY = ext ? -0.2 : -0.05;
    const mcpX = 0.08 + f * 0.04;

    points[fd.mcp] = [mcpX, 0, 0];
    points[fd.pip] = [mcpX, extY * 0.5, 0];
    points[fd.dip] = [mcpX, extY * 0.75, 0];
    points[fd.tip] = [mcpX, extY, 0];
  }

  // Curled fingers / "O" / "C" - fingertips closer to thumb
  if (label === "O" || label === "C") {
    for (let f = 0; f < 4; f++) {
      points[fingers[f].tip] = [0.05 + f * 0.02, -0.08, 0];
    }
  }

  if (label === "L") {
    points[8] = [0.3, -0.05, 0];
  }

  if (label === "Y") {
    points[8] = [0.05, -0.05, 0];
    points[20] = [0.25, -0.05, 0];
  }

  if (label === "I") {
    points[20] = [0.25, -0.2, 0];
  }

  if (label === "U" || label === "V" || label === "K") {
    const spread = label === "V" ? 0.04 : 0.01;
    points[8] = [0.08, -0.2, 0];
    points[12] = [0.08 + spread, -0.2, 0];
  }

  if (label === "W") {
    points[8] = [0.08, -0.2, 0];
    points[12] = [0.1, -0.2, 0];
    points[16] = [0.12, -0.2, 0];
  }

  // Add small random noise for variation
  for (let i = 0; i < 21; i++) {
    for (let j = 0; j < 3; j++) {
      points[i][j] += (Math.random() - 0.5) * noise;
    }
  }

  return points;
}

export function normalizeLandmarksLocal(points: number[][]): number[] {
  const wrist = points[0];
  const middleMcp = points[9];
  const scale = Math.hypot(
    middleMcp[0] - wrist[0],
    middleMcp[1] - wrist[1],
    middleMcp[2] - wrist[2]
  ) || 1;

  const out: number[] = [];
  for (const p of points) {
    out.push((p[0] - wrist[0]) / scale);
    out.push((p[1] - wrist[1]) / scale);
    out.push((p[2] - wrist[2]) / scale);
  }
  return out;
}

export interface TrainingSample {
  features: number[];
  label: string;
}

export async function loadPretrainedDataset(): Promise<TrainingSample[]> {
  const cached = await getCachedDataset("asl-synthetic-v1");
  if (cached && Array.isArray(cached)) {
    return cached as TrainingSample[];
  }

  const samples: TrainingSample[] = [];
  for (const label of ALPHABET) {
    for (let i = 0; i < 30; i++) {
      const points = buildSyntheticLandmarks(label, 0.05);
      const features = normalizeLandmarksLocal(points);
      samples.push({ features, label });
    }
  }

  await cachePrecollectedDataset("asl-synthetic-v1", samples);
  return samples;
}
