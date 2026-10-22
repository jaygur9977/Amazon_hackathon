<div align="center">

# 🛡️ AegisVision AI
### Autonomous Video Surveillance & Grounded Forensic Intelligence Platform
**Amazon Hackathon Project | Computer Vision • Multimodal Reasoning • Forensic RAG**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Python](https://img.shields.io/badge/Python_3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org/)
[![Groq](https://img.shields.io/badge/Groq_LPU-F55036?style=for-the-badge&logo=fastapi&logoColor=white)](https://groq.com/)
[![Vercel](https://img.shields.io/badge/Vercel_Ready-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

<p align="center">
  <a href="#-key-features">Key Features</a> •
  <a href="#-system-architecture">Architecture</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-api-reference">API Reference</a> •
  <a href="#-hosting-guide-vercel--render">Deployment</a>
</p>

</div>

---

## 📌 Executive Overview

**AegisVision AI** is an enterprise-grade smart video security intelligence platform designed for residential doorbells and commercial perimeter surveillance. While conventional security systems bombard homeowners with repetitive, uncontextualized motion alerts, AegisVision transforms raw CCTV and doorbell footage into **actionable forensic intelligence**.

The platform combines **adaptive coarse-to-fine keyframe extraction**, **multimodal vision classification (`Qwen 3.8-27B`)**, and a **grounded Retrieval-Augmented Generation (RAG) assistant (`GPT-OSS 120B`)** that allows users to converse directly with their camera network, query chronological timelines, review deterministic daily digests, and isolate high-risk perimeter breaches.

---

## ✨ Key Features

### 1. 🔍 Multimodal Computer Vision & Threat Engine
- **Coarse-to-Fine Keyframe Mining**: Performs an initial motion-entropy scan across the clip duration, identifies event transition boundaries, and extracts targeted high-motion evidence frames.
- **Multimodal Visual Reasoning**: Sends peak keyframes directly to high-throughput vision models (`qwen/qwen3.8-27b` via Groq) for high-accuracy event classification (package delivery, package collection, stranger package removal/theft, loitering/lingering, unusual activity).
- **Fallback Heuristics**: Resilient optical motion baseline ensures continuous offline classification if cloud endpoints become unreachable.

### 2. 💬 Grounded AI Assistant (Repository-Wide RAG)
- **Natural Language Video Querying**: Ask natural questions across all surveillance footage (e.g., *"Which clips contain a package removal?"*, *"Why was theft-03 marked high risk?"*, *"What happened at 00:08 in delivery-03.mp4?"*).
- **Zero-Hallucination Grounding**: Formats repository telemetry and multi-frame timelines into structured dossiers. The assistant cites exact bracketed clip IDs (`[D-03]`) and precise timestamps (`[00:08]`).
- **Negative Constraint Awareness**: Reliably acknowledges when requested actions or entities are not present in recorded telemetry instead of fabricating events.

### 3. 🔬 Per-Video Forensic Q&A Console
- Located on each clip's **Analysis Detail Page**.
- Users can interrogate specific video clips for detailed actor timelines, visible objects, dwell durations, and risk justifications.
- Synchronized bounding-box overlays and evidence frame galleries.

### 4. 📅 Instant Deterministic Daily Summary
- **Zero-Latency Computation**: Synthesizes structured activity digests directly from stored event records (`events-all.json` / `analyzed-events.json`) in `< 5ms` with zero mandatory external LLM calls.
- **5 Comprehensive Sections**:
  - **Daily Overview**: Total event counts, unique camera clips represented, and risk distribution (`high` vs `low`).
  - **Plain-English Activity Narrative**: Template-free chronological synthesis highlighting perimeter breaches, deliveries, and timeline boundaries.
  - **Prioritized High-Risk Incidents**: Dedicated alert cards featuring exact evidence justifications and one-click clip inspection.
  - **Category Breakdown**: Categorized event tallies with interactive clip badges.
  - **Chronological Event Timeline**: Sequenced timeline progression from first detected motion to concluding activity.
- **Embedded Assistant**: Embedded interactive Q&A console directly beneath daily digests.

### 5. 📹 Doorbell Live Feed & Video Library
- Realistic simulated security replay with real-time detection bounding boxes.
- Multi-camera filtering by severity (`All`, `High Risk`, `Low Risk`) and event type.
- Support for YouTube and remote MP4 URL ingestion via `yt-dlp`.

---

## 🏗️ System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        USER WEB BROWSER                                │
│          React 18 + TypeScript SPA (Vite / Tailwind / Framer)          │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTPS / REST / SSE
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        NODE.JS EXPRESS BACKEND                         │
│   ├── /api/videos      (Catalog, Stream, Delete, Per-Video RAG)        │
│   ├── /api/assistant   (Repository-Wide Grounded RAG Chat)             │
│   ├── /api/dashboard   (Deterministic Daily Summary & Metrics)         │
│   └── /api/analysis    (Subprocess Dispatch & Server-Sent Events)      │
└────────────┬───────────────────────┬──────────────────────┬────────────┘
             │                       │                      │
             ▼                       ▼                      ▼
┌────────────────────────┐  ┌─────────────────┐  ┌───────────────────────┐
│     PYTHON PIPELINE    │  │  ATOMIC JSON DB │  │   GROQ LPU INFERENCE  │
│  ├── OpenCV Keyframes  │  │  ├── events.json│  │   ├── Qwen 3.8-27B    │
│  ├── Motion Profiler   │  │  ├── jobs.json  │  │   │   (Multimodal CV) │
│  └── Frame Slicer      │  │  └── detections │  │   └── GPT-OSS 120B    │
└────────────────────────┘  └─────────────────┘  │       (Forensic RAG)  │
                                                 └───────────────────────┘
```

---

## 💻 Tech Stack

| Domain | Technology | Description |
|---|---|---|
| **Frontend** | React 18, TypeScript, Vite 6 | High-performance Single Page Application |
| **Styling** | Tailwind CSS, Lucide Icons, Framer Motion | Modern, responsive dark/light surveillance UI |
| **Backend** | Node.js (ESM), Express 4 | Modular REST API and Server-Sent Events (SSE) |
| **AI Inference** | Groq SDK (`openai/gpt-oss-120b`) | Ultra-fast token generation for grounded RAG |
| **Vision Model** | Groq SDK (`qwen/qwen3.8-27b`) | Multimodal keyframe inspection & classification |
| **Vision Pipeline** | Python 3, OpenCV, Pillow, yt-dlp | Keyframe slicing, optical flow, remote video ingest |
| **Data Layer** | Atomic JSON Store (`safeWriteJSON`) | Idempotent file persistence with NTFS lock fallback |
| **Deployment** | Vercel (Frontend) + Render (Backend) | Optimized serverless edge + persistent API server |

---

## 📂 Repository Structure

```text
Amazon-Hackathon/
├── backend/                        # Express API Backend
│   ├── routes/
│   │   ├── analysis.js             # Pipeline job dispatch & SSE progress stream
│   │   ├── assistant.js            # General-purpose RAG chat endpoint
│   │   ├── dashboard.js            # Deterministic daily summary & analytics
│   │   └── videos.js               # Clip catalog, remote ingest, per-video RAG
│   ├── services/
│   │   ├── pipelineService.js      # Python child process manager
│   │   ├── ragService.js           # Grounded RAG context builder & LLM client
│   │   ├── storageService.js       # Atomic JSON read/write & seeding
│   │   └── videoService.js         # Media file discovery & catalog indexer
│   ├── .env.example                # Template for backend secrets
│   ├── package.json
│   └── server.js                   # Main application entry point
├── clips/                          # Video clip storage
│   ├── amazon_hackathon_clips/     # 41 benchmark surveillance clips
│   └── uploaded/                   # User-uploaded / downloaded MP4 clips
├── detections/                     # Pre-computed bounding box telemetry
│   └── detections-all.json
├── events/                         # Persistent ground-truth & analyzed datasets
│   ├── analyzed-events.json        # 45 enriched video intelligence records
│   ├── events-all.json             # Canonical benchmark dataset
│   └── events.json                 # Core dataset definitions
├── evidence/                       # Keyframe evidence directories (frame-001.jpg...)
├── pipeline/                       # Python Computer Vision engine
│   ├── detect.py                   # Bounding box & motion detector
│   ├── download_stream.py          # yt-dlp URL ingestion handler
│   └── process_clip_single.py      # Iterative keyframe extractor & vision classifier
├── site/                           # React + TypeScript Frontend
│   ├── src/
│   │   ├── components/             # Reusable UI widgets (cards, modals, overlays)
│   │   ├── pages/
│   │   │   ├── AnalysisDetailPage.tsx # Clip detail & forensic chat
│   │   │   ├── AssistantPage.tsx       # Dedicated full-screen RAG console
│   │   │   ├── DailySummaryPage.tsx    # Deterministic daily activity digests
│   │   │   ├── DoorbellFeedPage.tsx    # Live simulation feed
│   │   │   ├── HomePage.tsx            # Executive telemetry dashboard
│   │   │   └── VideoLibraryPage.tsx    # Filterable surveillance library
│   │   ├── services/api.ts         # Centralized API client
│   │   ├── types/index.ts          # Unified TypeScript interfaces
│   │   └── vite-env.d.ts           # Vite client environment typings
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vercel.json                 # Vercel SPA routing rewrite config
│   └── vite.config.ts
├── VERCEL_HOSTING_GUIDE.txt        # Detailed step-by-step deployment instructions
└── README.md                       # Platform documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.9+ (with `pip`)
- **Groq API Key**: Obtain a free API key from [console.groq.com](https://console.groq.com)

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/jaygur9977/Amazon_hackathon.git
cd Amazon-Hackathon
```

### Step 2: Configure Backend Environment
Create `backend/.env`:
```bash
cp backend/.env.example backend/.env
```
Populate `backend/.env`:
```env
PORT=5000
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
GROQ_API_KEY=gsk_your_actual_groq_api_key_here
VIDEO_ROOT=clips
ANALYSIS_STORAGE_PATH=events/analyzed-events.json
JOBS_STORAGE_PATH=events/analysis-jobs.json
EVIDENCE_ROOT=evidence
```

### Step 3: Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../site
npm install
```

### Step 4: Install Python CV Requirements (Optional, for running new local analysis)
```bash
pip install opencv-python pillow groq yt-dlp
```

### Step 5: Start the Development Environment
Open two terminal windows:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd site
npm run dev
# Web application available at http://localhost:5173
```

---

## 📡 API Reference

### Video Catalog & Playback
- `GET /api/videos` — Retrieve all indexed surveillance clips with analysis state.
- `GET /api/videos/:id` — Get detailed metadata and telemetry for a specific clip.
- `GET /api/videos/:id/detections` — Get keyframe bounding boxes and entity timestamps.
- `POST /api/videos/ingest-url` — Ingest and download remote YouTube or MP4 video URL.
- `DELETE /api/videos/:id` — Delete uploaded clip and associated evidence frames.

### Forensic RAG & Intelligence
- `POST /api/assistant/chat` — General-purpose RAG chat query against full repository intelligence.
  ```json
  {
    "message": "Which clips show unauthorized package removal?",
    "history": []
  }
  ```
- `POST /api/videos/:id/ask` — Forensic question answering dedicated to a single clip.
  ```json
  {
    "question": "What did the visitor do between 00:02 and 00:08?",
    "history": []
  }
  ```
- `GET /api/assistant/sources` — Return indexed document sources and citations.

### Daily Summaries & Jobs
- `GET /api/dashboard/daily-summary?date=YYYY-MM-DD&risk=high` — Instant deterministic daily summary.
- `GET /api/dashboard/stats` — Overall repository metrics, risk ratios, and category counts.
- `POST /api/analysis/jobs` — Initiate computer vision analysis on selected video clips.
- `GET /api/analysis/jobs/:id/events` — Server-Sent Events (SSE) live progress stream.

---

## 🌐 Hosting Guide: Vercel + Render

Because video analysis and local video streaming require persistent storage and Python execution, this project uses the standard production architecture:

- **Frontend**: Hosted on **Vercel** (Global edge CDN, automated HTTPS, sub-second loads).
- **Backend**: Hosted on **Render.com** (Free/Starter persistent Node.js environment).

### Fast Deployment Steps

#### 1. Deploy Frontend on Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy site folder
cd site
vercel --prod
```
In your Vercel Dashboard (**Settings → Environment Variables**), add:
```env
API_BASE_URL=https://your-backend-app.onrender.com/api
```

#### 2. Deploy Backend on Render
1. Sign up on [render.com](https://render.com) and click **New + → Web Service**.
2. Connect your GitHub repository (`Amazon_hackathon`).
3. Set the following build parameters:
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. In the **Environment** tab, set:
   - `GROQ_API_KEY` = `your_actual_groq_api_key`
   - `CORS_ORIGINS` = `https://your-frontend.vercel.app,http://localhost:5173`
   - `PORT` = `10000`

> 📘 **For complete step-by-step instructions with all commands and troubleshooting tips, view [VERCEL_HOSTING_GUIDE.txt](./VERCEL_HOSTING_GUIDE.txt).**

---

## 🧪 Verification & Acceptance Testing

The platform has been validated against real surveillance scenarios:
- **Build Verification**: `site` builds cleanly via `tsc && vite build` with 0 errors.
- **RAG Accuracy**: Verified against complex multi-turn queries, temporal timestamps (`00:08`), risk justifications, and negative constraints.
- **Deterministic Latency**: Daily summary endpoints execute in `< 10ms` from cold start.

---

## 📄 License & Credits
Developed for the **Amazon Hackathon** by the AegisVision Engineering Team. Released under the [MIT License](LICENSE).
