import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { storageService } from './storageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

const CLIPS_ROOT = process.env.VIDEO_ROOT
  ? path.resolve(ROOT_DIR, process.env.VIDEO_ROOT)
  : path.join(ROOT_DIR, 'clips');
const THUMBNAILS_ROOT = path.join(ROOT_DIR, 'thumbnails');
const EVIDENCE_ROOT = path.join(ROOT_DIR, 'evidence');

function findMp4Files(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findMp4Files(fullPath, fileList);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.mp4')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

export const videoService = {
  getClipsRoot() {
    return CLIPS_ROOT;
  },

  getAllVideos() {
    const mp4Paths = findMp4Files(CLIPS_ROOT);
    const analyzedEvents = storageService.getAnalyzedEvents();
    const groundTruth = storageService.getGroundTruthEvents();
    const jobs = storageService.getJobs();

    // Map analyzed events by file_name and clip_id
    const analyzedMap = new Map();
    for (const ev of analyzedEvents) {
      if (ev.file_name) analyzedMap.set(ev.file_name, ev);
      if (ev.clip_id) analyzedMap.set(ev.clip_id, ev);
    }

    // Map ground truth by file_name and clip_id
    const groundTruthMap = new Map();
    for (const gt of groundTruth) {
      if (gt.file_name) groundTruthMap.set(gt.file_name, gt);
      if (gt.clip_id) groundTruthMap.set(gt.clip_id, gt);
    }

    // Check currently processing video filenames in active jobs
    const activeVideoFiles = new Set();
    for (const job of jobs) {
      if (job.status === 'processing' || job.status === 'queued') {
        (job.video_ids || []).forEach((id) => activeVideoFiles.add(id));
      }
    }

    const videos = [];

    for (const fullPath of mp4Paths) {
      const fileName = path.basename(fullPath);
      const stem = path.parse(fileName).name;
      const relPath = path.relative(CLIPS_ROOT, fullPath).replace(/\\/g, '/');
      const stat = fs.statSync(fullPath);

      // Bucket is the immediate parent directory or parent's parent
      const pathParts = relPath.split('/');
      const bucket = pathParts.length > 1 ? pathParts[0] : 'general';

      // Check thumbnail
      let thumbnailUrl = null;
      const thumbCandidates = [
        path.join(THUMBNAILS_ROOT, `${stem}.jpg`),
        path.join(THUMBNAILS_ROOT, `${fileName}.jpg`),
        path.join(THUMBNAILS_ROOT, `${bucket}.jpg`)
      ];
      for (const tc of thumbCandidates) {
        if (fs.existsSync(tc)) {
          thumbnailUrl = `/media/thumbnails/${path.basename(tc)}`;
          break;
        }
      }

      // Check evidence frames if available
      let evidenceFrames = [];
      const evidenceDir = path.join(EVIDENCE_ROOT, stem);
      if (fs.existsSync(evidenceDir)) {
        const frames = fs.readdirSync(evidenceDir).filter((f) => f.endsWith('.jpg'));
        evidenceFrames = frames.map((f) => `/media/evidence/${stem}/${f}`);
        if (!thumbnailUrl && frames.length > 0) {
          thumbnailUrl = `/media/evidence/${stem}/${frames[0]}`;
        }
      }

      // Check status
      const analysis = analyzedMap.get(fileName) || analyzedMap.get(stem) || null;
      const gt = groundTruthMap.get(fileName) || groundTruthMap.get(stem) || null;

      let status = 'not_analyzed';
      if (activeVideoFiles.has(fileName) || activeVideoFiles.has(stem)) {
        status = 'processing';
      } else if (analysis) {
        status = analysis.status === 'failed' ? 'failed' : 'completed';
      }

      // Duration estimate from ground truth if available, or file size heuristic
      const duration = gt?.duration_sec || 15.0;

      videos.push({
        id: stem,
        file_name: fileName,
        stem,
        bucket,
        relative_path: relPath,
        file_size_bytes: stat.size,
        duration_sec: duration,
        status,
        thumbnail_url: thumbnailUrl,
        video_url: `/media/clips/${relPath}`,
        has_analysis: !!analysis,
        analysis: analysis || null,
        ground_truth: gt || null,
        evidence_frames: evidenceFrames
      });
    }

    return videos;
  },

  getVideoById(id) {
    const videos = this.getAllVideos();
    return videos.find((v) => v.id === id || v.file_name === id || v.stem === id) || null;
  },

  resolveVideoPath(relativePath) {
    const safeRel = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.resolve(CLIPS_ROOT, safeRel);
    if (!fullPath.startsWith(CLIPS_ROOT)) {
      throw new Error('Access denied: path traversal detected');
    }
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Video file not found: ${relativePath}`);
    }
    return fullPath;
  }
};
