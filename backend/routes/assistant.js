import { Router } from 'express';
import { ragService } from '../services/ragService.js';

const router = Router();

// POST /api/assistant/chat - RAG Chat with Groq openai/gpt-oss-120b
router.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Query message is required.' });
    }

    const response = await ragService.askGroq(message, history || []);
    res.json({
      success: true,
      ...response
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/assistant/sources - View all indexed sources and documents
router.get('/sources', (req, res) => {
  try {
    const docs = ragService.getDocuments();
    res.json({
      success: true,
      count: docs.length,
      sources: docs.map((d) => ({
        id: d.id,
        clip_id: d.clip_id,
        file_name: d.file_name,
        type: d.type,
        event: d.event,
        risk: d.risk,
        unusual: d.unusual,
        description: d.description,
        thumbnail_url: d.thumbnail_url,
        evidence_frames: d.evidence_frames
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/assistant/reindex - Reindex all documents
router.post('/reindex', (req, res) => {
  try {
    const docs = ragService.getDocuments();
    res.json({
      success: true,
      message: `Successfully indexed ${docs.length} documents.`,
      count: docs.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
