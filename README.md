# SL-lator — Web-Based American Sign Language (ASL) Translator

SL-lator is a real-time, camera-driven ASL translator built on modern web technology. It uses MediaPipe Hands for client-side hand tracking, normalizing 21 3D landmarks into a sequence buffer that evaluates against Hugging Face inference models alongside a zero-latency geometric fallback classifier.

---

## Key Features

- **Real-Time Camera Capture**: Tracks hand pose at up to 30 FPS using MediaPipe Hands.
- **Scalable Architecture**: Low bandwidth overhead by sending normalized landmark arrays instead of heavy video streams.
- **Hugging Face Model Integration**: Connected to HF Serverless Inference API with local fallback for 100% offline uptime.
- **Comprehensive Logging & Export**: Session logs written to server-side NDJSON file (`./logs/translations-YYYY-MM-DD.log`) + instant client downloads (`.txt`, `.json`, `.csv`).
- **Data Flywheel / Active Learning Loop**: Built-in feedback form allowing users to submit corrections to refine future model iterations.

---

## Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, TypeScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Computer Vision**: `@mediapipe/hands`, `@mediapipe/camera_utils`
- **Model Inference**: [Hugging Face Serverless Inference API](https://huggingface.co/docs/api-inference/index)
- **Logging**: Next.js Node.js API Routes + File System

---

## How to Get Your Hugging Face API Token

1. Go to [Hugging Face](https://huggingface.co/) and log in or create a free account.
2. Navigate to your Profile Settings: click your avatar in top right $\rightarrow$ **Settings**.
3. Click **Access Tokens** in the left sidebar (or visit `https://huggingface.co/settings/tokens`).
4. Click **Create new token** / **New Token**.
5. Set token type to **Read** (or **Fine-grained** with model inference permission).
6. Give it a name (e.g. `SL-lator-Dev`) and click **Generate a token**.
7. Copy the token string (`hf_...`) and paste it into your `.env.local` file as `HF_TOKEN`.

---

## Getting Started

### Prerequisites

- **Node.js**: v18.17.0 or higher
- **npm**: v9.0.0 or higher
- **Webcam**: Attached camera device

### Installation

1. Clone repository:
   ```bash
   git clone https://github.com/ejafee/SL-lator.git
   cd SL-lator
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Environment Setup:
   Create a `.env.local` file in root:
   ```env
   HF_TOKEN=hf_your_huggingface_access_token_here
   HF_MODEL_ID=RavenOnur/Sign-Language
   LOG_DIR=./logs
   ```

4. Run Development Server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in browser.

---

## Production Build

```bash
npm run build
npm run start
```

---

## API Routes Summary

- `POST /api/translate`: Proxy route sending normalized landmarks to Hugging Face Inference API.
- `POST /api/log`: Appends session translations to server log files.
- `POST /api/feedback`: Stores user corrections for retraining data pipeline.

---

## License

[MIT](LICENSE)
