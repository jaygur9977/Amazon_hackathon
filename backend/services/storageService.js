import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

const EVENTS_DIR = path.join(ROOT_DIR, 'events');
const GROUND_TRUTH_PATH = path.join(EVENTS_DIR, 'events.json');
const MODEL_BASELINE_PATH = path.join(EVENTS_DIR, 'model-events.json');
const ANALYZED_EVENTS_PATH = process.env.ANALYSIS_STORAGE_PATH
  ? path.resolve(ROOT_DIR, process.env.ANALYSIS_STORAGE_PATH)
  : path.join(EVENTS_DIR, 'analyzed-events.json');
const JOBS_PATH = process.env.JOBS_STORAGE_PATH
  ? path.resolve(ROOT_DIR, process.env.JOBS_STORAGE_PATH)
  : path.join(EVENTS_DIR, 'analysis-jobs.json');

// Ensure events directory exists
if (!fs.existsSync(EVENTS_DIR)) {
  fs.mkdirSync(EVENTS_DIR, { recursive: true });
}

function safeReadJSON(filePath, fallback = []) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
  }
  return fallback;
}

function safeWriteJSON(filePath, data) {
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

export const storageService = {
  getGroundTruthEvents() {
    return safeReadJSON(GROUND_TRUTH_PATH, []);
  },

  getModelBaselineEvents() {
    return safeReadJSON(MODEL_BASELINE_PATH, []);
  },

  getAnalyzedEvents() {
    return safeReadJSON(ANALYZED_EVENTS_PATH, []);
  },

  saveAnalyzedEvents(records) {
    safeWriteJSON(ANALYZED_EVENTS_PATH, records);
  },

  upsertAnalyzedEvent(record) {
    const existing = this.getAnalyzedEvents();
    const index = existing.findIndex(
      (e) => e.file_name === record.file_name || e.clip_id === record.clip_id
    );
    if (index >= 0) {
      existing[index] = { ...existing[index], ...record, updated_at: new Date().toISOString() };
    } else {
      existing.push({
        ...record,
        created_at: record.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    this.saveAnalyzedEvents(existing);
    return existing;
  },

  getJobs() {
    return safeReadJSON(JOBS_PATH, []);
  },

  saveJobs(jobs) {
    safeWriteJSON(JOBS_PATH, jobs);
  },

  getJob(jobId) {
    const jobs = this.getJobs();
    return jobs.find((j) => j.id === jobId) || null;
  },

  upsertJob(job) {
    const jobs = this.getJobs();
    const index = jobs.findIndex((j) => j.id === job.id);
    if (index >= 0) {
      jobs[index] = { ...jobs[index], ...job, updated_at: new Date().toISOString() };
    } else {
      jobs.push({
        ...job,
        created_at: job.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    this.saveJobs(jobs);
    return job;
  }
};
