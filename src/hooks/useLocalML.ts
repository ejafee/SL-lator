"use client";

import { useEffect, useState } from "react";
import { getOrInitModel, retrainLocalModelOnFeedback } from "@/lib/local-model";
import { loadPretrainedDataset } from "@/lib/dataset";
import { getFeedbackCount, saveFeedback } from "@/lib/indexeddb";
import * as tf from "@tensorflow/tfjs";

export function useLocalML() {
  const [isReady, setIsReady] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState("Idle");

  useEffect(() => {
    async function init() {
      try {
        setTrainingStatus("Loading Pre-collected Dataset...");
        const dataset = await loadPretrainedDataset();

        setTrainingStatus("Initializing Local TF.js Model...");
        const model = await getOrInitModel();

        // Check if model needs initial training from dataset
        const feedbackCount = await getFeedbackCount();
        if (feedbackCount === 0 && dataset.length > 0) {
          setTrainingStatus("Pre-training Local Model...");
          const xs = tf.tensor2d(dataset.map((d) => d.features));
          const alphabet = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y"];
          const ys = tf.tensor2d(
            dataset.map((d) => {
              const oneHot = new Array(alphabet.length).fill(0);
              const idx = alphabet.indexOf(d.label);
              if (idx >= 0) oneHot[idx] = 1;
              return oneHot;
            })
          );

          await model.fit(xs, ys, { epochs: 10, batchSize: 32, shuffle: true });
          xs.dispose();
          ys.dispose();
          await model.save("indexeddb://asl-local-model");
        }

        setIsReady(true);
        setTrainingStatus("Ready");
      } catch (err: any) {
        setTrainingStatus(`Error: ${err.message}`);
      }
    }

    init();
  }, []);

  async function recordCorrection(label: string, landmarks: any[]) {
    await saveFeedback({ timestamp: new Date().toISOString(), label, landmarks });
    const count = await getFeedbackCount();
    if (count % 20 === 0) {
      setTrainingStatus("Retraining on feedback...");
      const res = await retrainLocalModelOnFeedback();
      setTrainingStatus(`Retrained on ${res.samples} samples`);
    }
  }

  return { isReady, trainingStatus, recordCorrection };
}
