import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import videosRouter from './routes/videos.js';
import analysisRouter from './routes/analysis.js';
import assistantRouter from './routes/assistant.js';
import dashboardRouter from './routes/dashboard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Load .env
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// CORS
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all in local development
      }
    },
    credentials: true
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Safe static media serving
const CLIPS_ROOT = path.resolve(ROOT_DIR, process.env.VIDEO_ROOT || 'clips');
const THUMBNAILS_ROOT = path.resolve(ROOT_DIR, 'thumbnails');
const EVIDENCE_ROOT = path.resolve(ROOT_DIR, process.env.EVIDENCE_ROOT || 'evidence');
const DETECTIONS_ROOT = path.resolve(ROOT_DIR, 'detections');

function serveSafeFile(baseDir, req, res) {
  try {
    const rawParam = req.params[0] || req.params.file || '';
    const safePath = path.normalize(rawParam).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.resolve(baseDir, safePath);

    if (!fullPath.startsWith(baseDir)) {
      return res.status(403).json({ error: 'Access denied: Path traversal detected' });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Video streaming with Range support
    const stat = fs.statSync(fullPath);
    const range = req.headers.range;

    if (range && fullPath.endsWith('.mp4')) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(fullPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4'
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      res.sendFile(fullPath);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

app.get('/media/clips/*', (req, res) => serveSafeFile(CLIPS_ROOT, req, res));
app.get('/media/thumbnails/:file', (req, res) => serveSafeFile(THUMBNAILS_ROOT, req, res));
app.get('/media/evidence/*', (req, res) => serveSafeFile(EVIDENCE_ROOT, req, res));
app.get('/media/detections/:file', (req, res) => serveSafeFile(DETECTIONS_ROOT, req, res));

// API routes
app.use('/api/videos', videosRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/assistant', assistantRouter);
app.use('/api/dashboard', dashboardRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    ai_model: 'openai/gpt-oss-120b',
    has_groq_key: Boolean(process.env.GROQ_API_KEY),
    has_anthropic_key: Boolean(process.env.ANTHROPIC_API_KEY)
  });
});

// Serve static frontend build if available
const SITE_DIST = path.resolve(ROOT_DIR, 'site', 'dist');
if (fs.existsSync(SITE_DIST)) {
  app.use(express.static(SITE_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/media')) {
      return next();
    }
    res.sendFile(path.join(SITE_DIST, 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`Clips directory: ${CLIPS_ROOT}`);
  console.log(`Evidence directory: ${EVIDENCE_ROOT}`);
});

export default app;
