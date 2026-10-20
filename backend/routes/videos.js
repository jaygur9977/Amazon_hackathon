import { Router } from 'express';
import { videoService } from '../services/videoService.js';

const router = Router();

// GET /api/videos - List all discovered videos with metadata and status
router.get('/', (req, res) => {
  try {
    const videos = videoService.getAllVideos();
    res.json({
      success: true,
      count: videos.length,
      videos
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/videos/:id - Single video metadata
router.get('/:id', (req, res) => {
  try {
    const video = videoService.getVideoById(req.params.id);
    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }
    res.json({ success: true, video });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
