# SL-lator — Web-Based American Sign Language (ASL) Translator

SL-lator is a real-time, camera-driven ASL translator built on modern web technology. It uses **MediaPipe Hands** for client-side hand tracking, **TensorFlow.js** for local on-device ML inference, and a server fallback via **Hugging Face Inference API**.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│  Frontend (Next.js 14, TypeScript)                                  │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────────┐│
│  │  Webcam Feed    │──│  MediaPipe Hands │──│  TF.js Local Model  ││
│  │  + Canvas       │  │  (BlazePalm +    │  │  + Geometric Rules  ││
│  │  (Live video)   │  │   21 3D joints)  │  │  (Fallback <50 ms)  ││
│  └─────────────────┘  └──────────────────┘  └─────────────────────┘│
│                        ▲                                              │
│                        │       Offline-First                          │
│               ┌────────────────────┐  ┌──────────────────────────────┐│
│               │  IndexedDB Cache   │  │   HF API Fallback (Optional)││
│               │  - Datasets        │◄─│   /api/translate            ││
│               │  - Corrections     │  │                              ││
│               └────────────────────┘  └──────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────┘
         │
   Post-Training / Logging
         ▼
   ./logs/*.log (NDJSON)  ←  /api/log, /api/feedback
```

---

## Key Features

- **Real-Time Camera Capture**: Tracks hand pose at up to 30 FPS using **MediaPipe Hands** (WASM/WebGL).
- **Offline-First Local ML**: TensorFlow.js MLP classifier (`@tensorflow/tfjs`) running 100% in-browser. IndexedDB persistence; no API key needed for local mode.
- **Scalable HF Fallback**: Optionally forwards landmark sequences to Hugging Face Inference API; geometric classifier guarantees baseline.
- **Comprehensive Logging**: Server NDJSON logs + client TXT/JSON/CSV export.
- **Continuous Improvement Loop**: Corrections saved in IndexedDB; periodic background retraining updates model weights.

---

## Local ML Stack

| Layer | Tech | Notes |
|-------|------|-------|
| Hand Tracking | `@mediapipe/hands` | 21 normalized 3D landmarks |
| Local Inference | `@tensorflow/tfjs` | 128→64→Softmax MLP on WebGL/WASM |
| Storage | IndexedDB (`SL_LATOR_DB`) | Datasets + user feedback samples |
| Pre-training | Synthetic landmark patterns | Result cached offline; replaceable with WLASL JSON |
| Retraining | Background `tf.model.fit` | Triggers every 20 corrections |

---

## Getting Started

### Prerequisites

- Node.js v18.17+
- Webcam + modern browser (Chrome/Firefox recommended)

### Installation

```bash
git clone https://github.com/ejafee/SL-lator.git
cd SL-lator
npm install
```

### Environment

Create `.env.local`:

```env
# Optional: only needed for Hugging Face remote fallback
HF_TOKEN=hf_your_token_here
HF_MODEL_ID=RavenOnur/Sign-Language
LOG_DIR=./logs
```

### Run

```bash
npm run dev    # http://localhost:3000
npm run build && npm start
```

---

## How to Get a Hugging Face Access Token (Optional)

1. Create / log in at [huggingface.co](https://huggingface.co).
2. Profile → **Settings → Access Tokens** (`https://huggingface.co/settings/tokens`).
3. **New Token** → type **Read** → Generate → copy `hf_…` into `HF_TOKEN`.

---

## API Routes

| Route | Purpose |
|-------|---------|
| `POST /api/translate` | Proxies landmark sequence to HF Inference API (fallback) |
| `POST /api/log` | Appends translations to `logs/translations-YYYY-MM-DD.log` |
| `POST /api/feedback` | Stores `logs/feedback-YYYY-MM-DD.log` for retraining |

---

## Project Layout

```
src/
  app/
    api/feedback  api/log  api/translate
  components/
    WebcamFeed  HandLandmarks
  hooks/
    useLocalML.ts
  lib/
    classifier.ts   indexeddb.ts   landmarks.ts   local-model.ts   dataset.ts
  types/
```

---

## License

[MIT](LICENSE)
