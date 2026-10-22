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

    // Group events by calendar date (YYYY-MM-DD)
    const dateGroups = {};

    for (const ev of analyzedEvents) {
      let dStr = '2026-10-21'; // Deterministic fallback date within hackathon window
      if (ev.timestamp) {
        try {
          const parsed = new Date(ev.timestamp);
          if (!isNaN(parsed.getTime())) {
            dStr = parsed.toISOString().slice(0, 10);
          }
        } catch {
          // fallback to dStr
        }
      } else if (ev.created_at) {
        try {
          const parsed = new Date(ev.created_at);
          if (!isNaN(parsed.getTime())) {
            dStr = parsed.toISOString().slice(0, 10);
          }
        } catch {}
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
      let rawEvents = dateGroups[dateKey] || [];

      // Optional date filter
      if (date && date !== 'all' && dateKey !== date) continue;

      // Optional risk filter
      let events = [...rawEvents];
      if (risk && risk !== 'all') {
        events = events.filter((e) => (e.risk || 'low').toLowerCase() === risk.toLowerCase());
      }

      if (events.length === 0) continue;

      // Unique clips calculation
      const uniqueClipIds = Array.from(new Set(events.map((e) => e.clip_id || e.file_name)));

      // Risk distribution
      const highRiskCount = events.filter((e) => e.risk === 'high').length;
      const mediumRiskCount = events.filter((e) => e.risk === 'medium').length;
      const lowRiskCount = events.filter((e) => !e.risk || e.risk === 'low').length;

      // Category breakdown
      const categoryMap = new Map();
      for (const e of events) {
        const cat = e.category || (e.event ? e.event.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Surveillance');
        if (!categoryMap.has(cat)) {
          categoryMap.set(cat, {
            category: cat,
            count: 0,
            high_risk_count: 0,
            clips: []
          });
        }
        const item = categoryMap.get(cat);
        item.count++;
        if (e.risk === 'high') item.high_risk_count++;
        item.clips.push({
          clip_id: e.clip_id,
          file_name: e.file_name,
          risk: e.risk || 'low'
        });
      }
      const categoryBreakdown = Array.from(categoryMap.values()).sort((a, b) => b.count - a.count);

      // Event classification counts
      const deliveryCount = events.filter((e) => e.event?.includes('delivered') || e.event?.includes('package') || e.category?.toLowerCase().includes('package')).length;
      const visitorCount = events.filter((e) => e.event === 'visitor_at_door' || e.category?.toLowerCase().includes('visitor')).length;
      const unusualCount = events.filter((e) => e.unusual || e.event === 'unusual_activity').length;

      // Map event items safely
      const formatEventItem = (e) => ({
        clip_id: e.clip_id,
        file_name: e.file_name,
        event: e.event,
        category: e.category || (e.event ? e.event.replace(/_/g, ' ') : 'Event'),
        risk: e.risk || 'low',
        riskEvidence: e.riskEvidence || '',
        unusual: Boolean(e.unusual),
        time_formatted: e.timestamp ? new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A',
        timestamp: e.timestamp || '',
        duration_sec: e.duration_sec || 15.0,
        description: e.description || '',
        detailedDescription: e.detailedDescription || e.description || '',
        evidence_frames: e.evidence_frames || [],
        timeline: e.timeline || []
      });

      // Chronological timeline: strictly sorted in chronological order (earliest to latest)
      const chronologicalTimeline = [...events]
        .sort((a, b) => {
          const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return tA - tB;
        })
        .map(formatEventItem);

      // High risk events: high risk only, sorted chronologically
      const highRiskEvents = events
        .filter((e) => e.risk === 'high')
        .sort((a, b) => {
          const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return tA - tB;
        })
        .map(formatEventItem);

      // Deterministic, rich plain-English narrative derived exclusively from stored records
      let narrative = `On ${dateKey}, a total of ${events.length} surveillance event(s) across ${uniqueClipIds.length} unique camera clip(s) were captured. `;
      
      if (highRiskCount > 0) {
        narrative += `CRITICAL ALERTS: ${highRiskCount} high-risk incident(s) were flagged by the security pipeline. `;
        const topHigh = highRiskEvents.slice(0, 2);
        const highHighlights = topHigh.map((h) => `[${h.clip_id}] ${h.description} (${h.riskEvidence || 'High threat indicators'})`).join('; ');
        narrative += `Noteworthy incidents include: ${highHighlights}. `;
      } else {
        narrative += `SECURITY STATUS: All recorded events for this period remained within normal low-risk baseline thresholds with zero critical perimeter threats. `;
      }

      if (deliveryCount > 0) {
        narrative += `LOGISTICS: ${deliveryCount} parcel or delivery interaction(s) took place at the front perimeter. `;
      }

      if (visitorCount > 0) {
        narrative += `VISITORS: ${visitorCount} visitor arrival(s) were cataloged at the doorway. `;
      }

      // Chronological sequence summary
      if (chronologicalTimeline.length > 0) {
        const first = chronologicalTimeline[0];
        const last = chronologicalTimeline[chronologicalTimeline.length - 1];
        if (first.time_formatted !== 'N/A' && last.time_formatted !== 'N/A') {
          narrative += `TIMELINE: Activity commenced at ${first.time_formatted} with "${first.category}" [${first.clip_id}] and concluded at ${last.time_formatted} with "${last.category}" [${last.clip_id}].`;
        }
      }

      // Backward compatible list (high risk prioritized, then latest)
      const backwardEvents = [...events]
        .sort((a, b) => {
          if (a.risk === 'high' && b.risk !== 'high') return -1;
          if (b.risk === 'high' && a.risk !== 'high') return 1;
          return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
        })
        .map(formatEventItem);

      summaries.push({
        date: dateKey,
        total_events: events.length,
        unique_clips_count: uniqueClipIds.length,
        unique_clips: uniqueClipIds,
        risk_distribution: {
          high: highRiskCount,
          medium: mediumRiskCount,
          low: lowRiskCount
        },
        high_risk_count: highRiskCount,
        delivery_count: deliveryCount,
        visitor_count: visitorCount,
        unusual_count: unusualCount,
        category_breakdown: categoryBreakdown,
        high_risk_events: highRiskEvents,
        chronological_timeline: chronologicalTimeline,
        plain_english_summary: narrative.trim(),
        events: backwardEvents
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
