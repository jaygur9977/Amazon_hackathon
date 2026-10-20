import { Router } from 'express';
import { videoService } from '../services/videoService.js';
import { storageService } from '../services/storageService.js';

const router = Router();

// GET /api/dashboard/stats - Real analytics based on available and analyzed videos
router.get('/stats', (req, res) => {
  try {
    const videos = videoService.getAllVideos();
    const analyzedEvents = storageService.getAnalyzedEvents();
    const jobs = storageService.getJobs();

    const totalVideos = videos.length;
    const completedAnalyses = analyzedEvents.filter((a) => a.status !== 'failed');
    const failedAnalyses = analyzedEvents.filter((a) => a.status === 'failed');

    const highRiskEvents = completedAnalyses.filter((a) => a.risk === 'high');
    const unusualEvents = completedAnalyses.filter((a) => a.unusual === true);

    const pendingJobs = jobs.filter((j) => j.status === 'queued').length;
    const processingJobs = jobs.filter((j) => j.status === 'processing').length;
    const failedJobs = jobs.filter((j) => j.status === 'failed').length;

    // Event distribution breakdown
    const eventCounts = {};
    for (const ev of completedAnalyses) {
      const name = ev.event || 'unknown';
      eventCounts[name] = (eventCounts[name] || 0) + 1;
    }

    // Risk distribution breakdown
    const riskCounts = {
      low: completedAnalyses.filter((a) => a.risk === 'low').length,
      high: completedAnalyses.filter((a) => a.risk === 'high').length
    };

    // Recent activity timeline (latest 8 analyzed events)
    const recentActivity = [...completedAnalyses]
      .sort((a, b) => new Date(b.analyzed_at || b.timestamp) - new Date(a.analyzed_at || a.timestamp))
      .slice(0, 8);

    res.json({
      success: true,
      stats: {
        total_videos: totalVideos,
        analyzed_videos: completedAnalyses.length,
        not_analyzed_videos: Math.max(0, totalVideos - completedAnalyses.length),
        failed_videos: failedAnalyses.length,
        high_risk_count: highRiskEvents.length,
        unusual_activity_count: unusualEvents.length,
        jobs: {
          pending: pendingJobs,
          processing: processingJobs,
          failed: failedJobs,
          total: jobs.length
        },
        event_distribution: eventCounts,
        risk_distribution: riskCounts,
        recent_activity: recentActivity
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
