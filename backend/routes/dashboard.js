import { Router } from 'express';
import { videoService } from '../services/videoService.js';
import { storageService } from '../services/storageService.js';

const router = Router();

// GET /api/dashboard/stats - Overview analytics based on all 41 clips
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

    // Recent activity timeline
    const recentActivity = [...completedAnalyses]
      .sort((a, b) => new Date(b.analyzed_at || b.timestamp) - new Date(a.analyzed_at || a.timestamp))
      .slice(0, 10);

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

// GET /api/dashboard/daily-summary - Deterministic daily summaries grouped by calendar date
router.get('/daily-summary', (req, res) => {
  try {
    const analyzedEvents = storageService.getAnalyzedEvents();
    const { date, risk } = req.query;

    // Group events by date (YYYY-MM-DD)
    const dateGroups = {};

    for (const ev of analyzedEvents) {
      let dStr = 'Unknown Date';
      if (ev.timestamp) {
        try {
          const parsed = new Date(ev.timestamp);
          if (!isNaN(parsed.getTime())) {
            dStr = parsed.toISOString().slice(0, 10);
          }
        } catch {
          // fallback to Unknown Date
        }
      }

      if (!dateGroups[dStr]) {
        dateGroups[dStr] = [];
      }
      dateGroups[dStr].push(ev);
    }

    // Process each date group
    const summaries = [];
    const availableDates = Object.keys(dateGroups).sort().reverse();

    for (const dateKey of availableDates) {
      let events = dateGroups[dateKey];

      // Optional filters
      if (date && date !== 'all' && dateKey !== date) continue;
      if (risk && risk !== 'all') {
        events = events.filter((e) => e.risk === risk);
      }

      if (events.length === 0) continue;

      // Sort: high risk first, then by timestamp
      events.sort((a, b) => {
        if (a.risk === 'high' && b.risk !== 'high') return -1;
        if (b.risk === 'high' && a.risk !== 'high') return 1;
        return new Date(b.timestamp) - new Date(a.timestamp);
      });

      const highRiskCount = events.filter((e) => e.risk === 'high').length;
      const deliveryCount = events.filter((e) => e.event?.includes('delivered') || e.event?.includes('package')).length;
      const visitorCount = events.filter((e) => e.event === 'visitor_at_door').length;
      const unusualCount = events.filter((e) => e.unusual).length;

      // Generate deterministic plain-English narrative
      let narrative = `On ${dateKey}, a total of ${events.length} video surveillance event(s) were recorded. `;
      if (highRiskCount > 0) {
        narrative += `⚠️ ${highRiskCount} high-risk security incident(s) were flagged, including suspicious perimeter activity or unauthorized access attempts. `;
      } else {
        narrative += `✅ No critical security threats or perimeter breaches were recorded. `;
      }
      if (deliveryCount > 0) {
        narrative += `📦 ${deliveryCount} parcel delivery or retrieval interaction(s) took place at the front entryway. `;
      }
      if (visitorCount > 0) {
        narrative += `🚪 ${visitorCount} visitor arrival(s) were logged at the door. `;
      }

      summaries.push({
        date: dateKey,
        total_events: events.length,
        high_risk_count: highRiskCount,
        delivery_count: deliveryCount,
        visitor_count: visitorCount,
        unusual_count: unusualCount,
        plain_english_summary: narrative.trim(),
        events: events.map((e) => ({
          clip_id: e.clip_id,
          file_name: e.file_name,
          event: e.event,
          category: e.category || e.event.replace(/_/g, ' '),
          risk: e.risk,
          riskEvidence: e.riskEvidence || '',
          unusual: e.unusual,
          time_formatted: e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : 'N/A',
          timestamp: e.timestamp,
          duration_sec: e.duration_sec,
          description: e.description,
          evidence_frames: e.evidence_frames || [],
          timeline: e.timeline || []
        }))
      });
    }

    res.json({
      success: true,
      available_dates: availableDates,
      summaries
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
