import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { EventEmitter } from 'events';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { storageService } from './storageService.js';
import { videoService } from './videoService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

const EVIDENCE_ROOT = process.env.EVIDENCE_ROOT
  ? path.resolve(ROOT_DIR, process.env.EVIDENCE_ROOT)
  : path.join(ROOT_DIR, 'evidence');
const PYTHON_SCRIPT = path.join(ROOT_DIR, 'pipeline', 'process_clip_single.py');

class PipelineEmitter extends EventEmitter {}
export const pipelineEvents = new PipelineEmitter();

const REQUIRED_FIELDS = ['event', 'risk', 'description'];
const VALID_EVENTS = [
  'package_delivered',
  'package_left_at_door',
  'visitor_at_door',
  'package_collected_by_resident',
  'package_taken_by_stranger',
  'person_lingering',
  'unusual_activity'
];

export const pipelineService = {
  activeJobs: new Map(),

  createJob(videoIds) {
    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      throw new Error('At least one video ID must be provided');
    }

    // Validate that each video exists
    const allVideos = videoService.getAllVideos();
    const resolvedVideos = [];

    for (const vid of videoIds) {
      const video = allVideos.find(
        (v) => v.id === vid || v.file_name === vid || v.stem === vid
      );
      if (!video) {
        throw new Error(`Invalid video ID: ${vid} not found in library`);
      }
      resolvedVideos.push(video);
    }

    const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const job = {
      id: jobId,
      status: 'queued', // queued | processing | completed | failed
      video_ids: resolvedVideos.map((v) => v.id),
      total_videos: resolvedVideos.length,
      completed_videos: 0,
      current_video: null,
      stage: 'queued',
      progress_percent: 0,
      logs: [
        `[${new Date().toISOString()}] Job ${jobId} created with ${resolvedVideos.length} clip(s).`
      ],
      results: [],
      error: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    storageService.upsertJob(job);

    // Run job asynchronously in the background
    setImmediate(() => {
      this.executeJob(job, resolvedVideos);
    });

    return job;
  },

  log(job, message) {
    const entry = `[${new Date().toISOString()}] ${message}`;
    job.logs.push(entry);
    pipelineEvents.emit(`job:${job.id}:log`, { jobId: job.id, message: entry, status: job.status, stage: job.stage });
    storageService.upsertJob(job);
  },

  async executeJob(job, videos) {
    job.status = 'processing';
    job.stage = 'initializing';
    this.log(job, `Starting analysis of ${videos.length} clip(s)...`);

    const results = [];

    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      job.current_video = video.file_name;
      job.stage = `processing_clip_${i + 1}_of_${videos.length}`;
      job.progress_percent = Math.round((i / videos.length) * 100);

      this.log(
        job,
        `Processing [${i + 1}/${videos.length}] ${video.file_name} (${video.bucket})...`
      );

      try {
        const result = await this.analyzeSingleVideo(video, job);
        results.push(result);
        job.results.push(result);
        job.completed_videos += 1;
        job.progress_percent = Math.round((job.completed_videos / videos.length) * 100);

        this.log(
          job,
          `Completed ${video.file_name}: Event="${result.event}" Risk="${result.risk}" Unusual=${result.unusual}`
        );

        // Store analysis result persistently
        storageService.upsertAnalyzedEvent(result);
      } catch (err) {
        this.log(job, `Error processing ${video.file_name}: ${err.message}`);
        const failedResult = {
          clip_id: video.id,
          file_name: video.file_name,
          bucket: video.bucket,
          status: 'failed',
          error: err.message,
          timestamp: new Date().toISOString()
        };
        results.push(failedResult);
        job.results.push(failedResult);
        storageService.upsertAnalyzedEvent(failedResult);
      }
    }

    job.current_video = null;
    const hasFailures = results.some((r) => r.status === 'failed');
    job.status = hasFailures && results.every((r) => r.status === 'failed') ? 'failed' : 'completed';
    job.stage = 'finished';
    job.progress_percent = 100;
    job.updated_at = new Date().toISOString();

    this.log(job, `Job finished with status: ${job.status}. Analyzed ${job.completed_videos}/${videos.length} successfully.`);
    storageService.upsertJob(job);

    pipelineEvents.emit(`job:${job.id}:done`, job);
  },

  analyzeSingleVideo(video, job) {
    return new Promise((resolve, reject) => {
      const fullVideoPath = videoService.resolveVideoPath(video.relative_path);
      const clipEvidenceDir = path.join(EVIDENCE_ROOT, video.id);

      if (!fs.existsSync(clipEvidenceDir)) {
        fs.mkdirSync(clipEvidenceDir, { recursive: true });
      }

      this.log(job, `Extracting frames and running vision analysis on ${video.file_name}...`);

      const pythonExec = process.platform === 'win32' ? 'python' : 'python3';
      const args = [
        PYTHON_SCRIPT,
        '--clip', fullVideoPath,
        '--out-dir', clipEvidenceDir,
        '--max-frames', '8'
      ];

      // Safe subprocess execution without shell=True
      const proc = spawn(pythonExec, args, {
        cwd: ROOT_DIR,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1'
        }
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      proc.stderr.on('data', (chunk) => {
        const msg = chunk.toString().trim();
        stderr += msg;
        if (msg) {
          this.log(job, `[engine:stderr] ${msg}`);
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to spawn Python process: ${err.message}`));
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          return reject(
            new Error(`Python process exited with code ${code}. Stderr: ${stderr || 'Unknown'}`)
          );
        }

        try {
          const lines = stdout.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          const record = JSON.parse(lastLine);

          // Validate against expected schema
          for (const field of REQUIRED_FIELDS) {
            if (!(field in record)) {
              throw new Error(`Missing required field in output: ${field}`);
            }
          }

          if (!VALID_EVENTS.includes(record.event)) {
            throw new Error(`Invalid event type returned: ${record.event}`);
          }

          const evidenceFrames = (record.evidence_frames || []).map(
            (fn) => `/media/evidence/${video.id}/${fn}`
          );

          const finalRecord = {
            clip_id: video.id,
            file_name: video.file_name,
            bucket: video.bucket,
            timestamp: new Date().toISOString(),
            event: record.event,
            objects: Array.isArray(record.objects) ? record.objects : [],
            risk: record.risk === 'high' ? 'high' : 'low',
            unusual: Boolean(record.unusual),
            description: record.description,
            source: record.source || 'ai-vision-pipeline',
            evidence_frames: evidenceFrames,
            status: 'completed',
            pipeline_version: '1.2.0',
            analyzed_at: new Date().toISOString()
          };

          resolve(finalRecord);
        } catch (err) {
          reject(new Error(`Failed to parse engine output: ${err.message}. Output was: ${stdout}`));
        }
      });
    });
  }
};
