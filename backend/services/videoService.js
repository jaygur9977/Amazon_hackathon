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
    const diskFileMap = new Map();
    for (const p of mp4Paths) {
      const fn = path.basename(p);
      const stem = path.parse(fn).name;
      diskFileMap.set(fn, p);
      diskFileMap.set(stem, p);
    }

    const authoritativeDataset = storageService.getAuthoritativeDataset();
    const analyzedEvents = storageService.getAnalyzedEvents();
    const jobs = storageService.getJobs();
    const detectionsAll = storageService.getDetectionsAll();

    // Index analyzed events
    const analyzedMap = new Map();
    for (const ev of analyzedEvents) {
      if (ev.file_name) analyzedMap.set(ev.file_name, ev);
      if (ev.clip_id) analyzedMap.set(ev.clip_id, ev);
      if (ev.stem) analyzedMap.set(ev.stem, ev);
    }

    // Index active processing jobs
    const activeVideoFiles = new Set();
    for (const job of jobs) {
      if (job.status === 'processing' || job.status === 'queued') {
        (job.video_ids || []).forEach((id) => {
          activeVideoFiles.add(id);
          activeVideoFiles.add(path.parse(id).name);
        });
      }
    }

    // Index detections
    const detectionMap = new Map();
    for (const det of detectionsAll) {
      if (det.clip_id) detectionMap.set(det.clip_id, det);
      if (det.file_name) detectionMap.set(det.file_name, det);
      const stem = path.parse(det.file_name || '').name;
      if (stem) detectionMap.set(stem, det);
    }

    const videos = [];
    const processedKeys = new Set();

    // 1. Process all authoritative dataset clips (all 41 clips)
    for (const seed of authoritativeDataset) {
      const fileName = seed.file_name;
      const stem = path.parse(fileName).name;
      const clipId = seed.clip_id || stem;
      processedKeys.add(fileName);
      processedKeys.add(stem);
      processedKeys.add(clipId);

      const localPath = diskFileMap.get(fileName) || diskFileMap.get(stem);
      let relativePath = null;
      let fileSize = null;
      let hasMediaFile = false;

      if (localPath && fs.existsSync(localPath)) {
        relativePath = path.relative(CLIPS_ROOT, localPath).replace(/\\/g, '/');
        const stat = fs.statSync(localPath);
        fileSize = stat.size;
        hasMediaFile = true;
      }

      // Check thumbnail
      let thumbnailUrl = null;
      const thumbCandidates = [
        path.join(THUMBNAILS_ROOT, `${stem}.jpg`),
        path.join(THUMBNAILS_ROOT, `${fileName}.jpg`),
        path.join(THUMBNAILS_ROOT, `${seed.bucket}.jpg`)
      ];
      for (const tc of thumbCandidates) {
        if (fs.existsSync(tc)) {
          thumbnailUrl = `/media/thumbnails/${path.basename(tc)}`;
          break;
        }
      }

      // Evidence frames
      let evidenceFrames = [];
      const evidenceDir = path.join(EVIDENCE_ROOT, stem);
      if (fs.existsSync(evidenceDir)) {
        const frames = fs.readdirSync(evidenceDir).filter((f) => f.endsWith('.jpg'));
        evidenceFrames = frames.map((f) => `/media/evidence/${stem}/${f}`);
        if (!thumbnailUrl && frames.length > 0) {
          thumbnailUrl = `/media/evidence/${stem}/${frames[0]}`;
        }
      }

      const det = detectionMap.get(clipId) || detectionMap.get(fileName) || detectionMap.get(stem) || null;
      if (!thumbnailUrl && det?.peak_frame) {
        thumbnailUrl = `/media/evidence/${stem}/${det.peak_frame}`;
      }

      const analysis = analyzedMap.get(clipId) || analyzedMap.get(fileName) || analyzedMap.get(stem) || null;

      let status = 'not_analyzed';
      if (activeVideoFiles.has(clipId) || activeVideoFiles.has(fileName) || activeVideoFiles.has(stem)) {
        status = 'processing';
      } else if (analysis) {
        status = analysis.status === 'failed' ? 'failed' : 'completed';
      }

      const duration = seed.duration_sec || (det?.frames?.length ? det.frames.length * 2 : 15.0);

      videos.push({
        id: clipId,
        clip_id: clipId,
        file_name: fileName,
        stem,
        bucket: seed.bucket,
        relative_path: relativePath,
        file_size_bytes: fileSize,
        duration_sec: duration,
        status,
        has_media_file: hasMediaFile,
        thumbnail_url: thumbnailUrl,
        video_url: hasMediaFile ? `/media/clips/${relativePath}` : null,
        has_analysis: !!analysis,
        analysis: analysis || null,
        ground_truth: seed,
        evidence_frames: evidenceFrames,
        has_detections: !!det,
        peak_time_seconds: det?.peak_time_seconds ?? null,
        is_dataset_benchmark: !hasMediaFile
      });
    }

    // 2. Add any additional uploaded/local files that aren't in events-all.json
    for (const [fn, fullPath] of diskFileMap.entries()) {
      if (!fn.endsWith('.mp4')) continue;
      const stem = path.parse(fn).name;
      if (processedKeys.has(fn) || processedKeys.has(stem)) continue;

      const relPath = path.relative(CLIPS_ROOT, fullPath).replace(/\\/g, '/');
      const stat = fs.statSync(fullPath);
      const pathParts = relPath.split('/');
      const bucket = pathParts.length > 1 ? pathParts[0] : 'uploads';

      const analysis = analyzedMap.get(fn) || analyzedMap.get(stem) || null;
      let status = 'not_analyzed';
      if (activeVideoFiles.has(fn) || activeVideoFiles.has(stem)) {
        status = 'processing';
      } else if (analysis) {
        status = analysis.status === 'failed' ? 'failed' : 'completed';
      }

      videos.push({
        id: stem,
        clip_id: stem,
        file_name: fn,
        stem,
        bucket,
        relative_path: relPath,
        file_size_bytes: stat.size,
        duration_sec: 15.0,
        status,
        has_media_file: true,
        thumbnail_url: null,
        video_url: `/media/clips/${relPath}`,
        has_analysis: !!analysis,
        analysis: analysis || null,
        ground_truth: null,
        evidence_frames: [],
        has_detections: false,
        peak_time_seconds: null,
        is_dataset_benchmark: false
      });
    }

    return videos;
  },

  getVideoById(id) {
    const videos = this.getAllVideos();
    const stem = path.parse(id).name;
    return videos.find((v) => 
      v.id === id || 
      v.clip_id === id || 
      v.file_name === id || 
      v.stem === id ||
      v.stem === stem
    ) || null;
  },

  resolveVideoPath(relativePath) {
    if (!relativePath) {
      throw new Error('No relative path provided');
    }
    const safeRel = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
    const fullPath = path.resolve(CLIPS_ROOT, safeRel);
    if (!fullPath.startsWith(CLIPS_ROOT)) {
      throw new Error('Access denied: path traversal detected');
    }
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Video file not found: ${relativePath}`);
    }
    return fullPath;
  },

  deleteVideo(id) {
    const video = this.getVideoById(id);
    if (!video) {
      throw new Error(`Video with id "${id}" not found.`);
    }

    // Protect core benchmark dataset clips from accidental deletion
    if (video.is_dataset_benchmark || (video.bucket !== 'uploaded' && video.bucket !== 'uploads')) {
      throw new Error('Only user-uploaded videos can be deleted. Benchmark dataset clips are protected.');
    }

    // 1. Delete physical video file from disk
    if (video.relative_path) {
      try {
        const fullPath = this.resolveVideoPath(video.relative_path);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (err) {
        console.warn(`Could not unlink video file: ${err.message}`);
      }
    }

    // 2. Delete extracted evidence directory if exists
    const stem = video.stem || video.id;
    const evidenceDir = path.join(EVIDENCE_ROOT, stem);
    if (fs.existsSync(evidenceDir)) {
      try {
        fs.rmSync(evidenceDir, { recursive: true, force: true });
      } catch (err) {
        console.warn(`Could not remove evidence directory: ${err.message}`);
      }
    }

    // 3. Remove from analyzed-events
    storageService.deleteAnalyzedEvent(video.id);
    storageService.deleteAnalyzedEvent(stem);

    // 4. Remove from analysis-jobs
    storageService.removeVideoFromJobs(video.id);

    return {
      success: true,
      message: `Video "${video.file_name}" and associated evidence deleted successfully.`
    };
  }
};
