import * as tf from "@tensorflow/tfjs";
import { NormalizedLandmark, TranslationResult } from "@/types";
import { normalizeLandmarks } from "@/lib/landmarks";
import { getAllFeedback } from "@/lib/indexeddb";

const ALPHABET = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y"];

let modelInstance: tf.LayersModel | null = null;
let isTraining = false;

/**
 * Constructs a dense 2-layer Neural Network for ASL landmark classification
 */
export function createLocalModel(): tf.LayersModel {
  const model = tf.sequential();
  model.add(
    tf.layers.dense({
      inputShape: [63],
      units: 128,
      activation: "relu",
      kernelInitializer: "heNormal",
    })
  );
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(
    tf.layers.dense({
      units: 64,
      activation: "relu",
    })
  );
  model.add(
    tf.layers.dense({
      units: ALPHABET.length,
      activation: "softmax",
    })
  );

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"],
  });

  return model;
}

export async function getOrInitModel(): Promise<tf.LayersModel> {
  if (modelInstance) return modelInstance;

  try {
    // Try loading saved model from IndexedDB
    modelInstance = await tf.loadLayersModel("indexeddb://asl-local-model");
  } catch (e) {
    // If not found, create new instance
    modelInstance = createLocalModel();
  }

  return modelInstance;
}

/**
 * Evaluates hand landmarks through local TF.js neural network
 */
export async function predictLocalTF(landmarks: NormalizedLandmark[]): Promise<TranslationResult | null> {
  if (!landmarks || landmarks.length !== 21) return null;

  const model = await getOrInitModel();
  const normalized = normalizeLandmarks(landmarks);
  if (normalized.length !== 63) return null;

  const inputTensor = tf.tensor2d([normalized], [1, 63]);
  const prediction = model.predict(inputTensor) as tf.Tensor;
  const probabilities = await prediction.data();

  inputTensor.dispose();
  prediction.dispose();

  let maxIdx = 0;
  let maxProb = 0;
  for (let i = 0; i < probabilities.length; i++) {
    if (probabilities[i] > maxProb) {
      maxProb = probabilities[i];
      maxIdx = i;
    }
  }

  if (maxProb < 0.4) return null; // Low confidence threshold

  return {
    gloss: ALPHABET[maxIdx] || "?",
    confidence: maxProb,
    isFallback: false,
  };
}

/**
 * Triggers full retraining cycle using IndexedDB feedback samples
 */
export async function retrainLocalModelOnFeedback(): Promise<{ success: boolean; samples: number }> {
  if (isTraining) return { success: false, samples: 0 };
  isTraining = true;

  try {
    const feedback = await getAllFeedback();
    if (feedback.length < 10) {
      isTraining = false;
      return { success: false, samples: feedback.length };
    }

    const xs: number[][] = [];
    const ys: number[][] = [];

    for (const item of feedback) {
      const norm = normalizeLandmarks(item.landmarks);
      if (norm.length === 63 && ALPHABET.includes(item.label)) {
        xs.push(norm);
        const oneHot = new Array(ALPHABET.length).fill(0);
        oneHot[ALPHABET.indexOf(item.label)] = 1;
        ys.push(oneHot);
      }
    }

    if (xs.length === 0) {
      isTraining = false;
      return { success: false, samples: 0 };
    }

    const xTensor = tf.tensor2d(xs);
    const yTensor = tf.tensor2d(ys);

    const model = await getOrInitModel();
    await model.fit(xTensor, yTensor, {
      epochs: 15,
      batchSize: 16,
      shuffle: true,
    });

    xTensor.dispose();
    yTensor.dispose();

    await model.save("indexeddb://asl-local-model");
    modelInstance = model;

    isTraining = false;
    return { success: true, samples: xs.length };
  } catch (err) {
    isTraining = false;
    return { success: false, samples: 0 };
  }
}
