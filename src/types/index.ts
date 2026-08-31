export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface HandLandmarks {
  landmarks: NormalizedLandmark[];
  handedness: "Left" | "Right";
}

export interface TranslationResult {
  gloss: string;
  confidence: number;
  isFallback: boolean;
}

export interface LogEntry {
  timestamp: string;
  gloss: string;
  confidence: number;
  isFallback: boolean;
  landmarks?: NormalizedLandmark[];
}

export interface AppSettings {
  sensitivity: number;
  useFallback: boolean;
  cameraFacingMode: "user" | "environment";
}