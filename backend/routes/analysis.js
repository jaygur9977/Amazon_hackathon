import { Router } from 'express';
import { pipelineService, pipelineEvents } from '../services/pipelineService.js';
import { storageService } from '../services/storageService.js';

const router = Router();

// POST /api/analysis/jobs - Create and start analysis job for selected clips
router.post('/jobs', (req, res) => {
  try {
    const { video_ids } = req.body;
    if (!video_ids || !Array.isArray(video_ids) || video_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'video_ids must be a non-empty array of video IDs'
      });
    }

    const job = pipelineService.createJob(video_ids);
    res.status(201).json({
      success: true,
      message: `Job ${job.id} created for ${video_ids.length} clip(s)`,
      job
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/analysis/jobs/clear-processing - Cancel / clear stuck processing jobs
router.post('/jobs/clear-processing', (req, res) => {
  try {
    const jobs = storageService.clearStuckProcessingJobs();
    res.json({
      success: true,
      message: 'All in-flight and processing jobs have been cleared successfully.',
      count: jobs.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/analysis/jobs - List all jobs
router.get('/jobs', (req, res) => {
  try {
    const jobs = storageService.getJobs();
    res.json({
      success: true,
      count: jobs.length,
      jobs: jobs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/analysis/jobs/:job_id - Job details
router.get('/jobs/:job_id', (req, res) => {
  try {
    const job = storageService.getJob(req.params.job_id);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    res.json({ success: true, job });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/analysis/jobs/:job_id/events - SSE Stream for real-time progress and logs
router.get('/jobs/:job_id/events', (req, res) => {
  const jobId = req.params.job_id;
  const job = storageService.getJob(jobId);

  if (!job) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  res.write(`data: ${JSON.stringify({ type: 'init', job })}\n\n`);

  const onLog = (data) => {
    res.write(`data: ${JSON.stringify({ type: 'log', ...data })}\n\n`);
  };

  const onDone = (updatedJob) => {
    res.write(`data: ${JSON.stringify({ type: 'done', job: updatedJob })}\n\n`);
    res.end();
  };

  const logEvent = `job:${jobId}:log`;
  const doneEvent = `job:${jobId}:done`;

  pipelineEvents.on(logEvent, onLog);
  pipelineEvents.on(doneEvent, onDone);

  // If job is already finished, send done immediately
  if (job.status === 'completed' || job.status === 'failed') {
    res.write(`data: ${JSON.stringify({ type: 'done', job })}\n\n`);
    res.end();
  }

  req.on('close', () => {
    pipelineEvents.off(logEvent, onLog);
    pipelineEvents.off(doneEvent, onDone);
  });
});

// GET /api/analysis/results - List all persistent analyzed results
router.get('/results', (req, res) => {
  try {
    const results = storageService.getAnalyzedEvents();
    res.json({
      success: true,
      count: results.length,
      results
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/analysis/results/:analysis_id - Single analysis result
router.get('/results/:analysis_id', (req, res) => {
  try {
    const id = req.params.analysis_id;
    const results = storageService.getAnalyzedEvents();
    const result = results.find((r) => r.clip_id === id || r.file_name === id);
    if (!result) {
      return res.status(404).json({ success: false, error: 'Analysis record not found' });
    }
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/analysis/results/:analysis_id/retry - Retry single analysis
router.post('/results/:analysis_id/retry', (req, res) => {
  try {
    const id = req.params.analysis_id;
    const job = pipelineService.createJob([id]);
    res.json({
      success: true,
      message: `Retry scheduled for ${id}`,
      job
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
