import Groq from 'groq-sdk';
import path from 'path';
import { storageService } from './storageService.js';
import { videoService } from './videoService.js';

function tokenize(text) {
  if (!text) return [];
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function calculateScore(queryTokens, docTokens) {
  if (!queryTokens.length || !docTokens.length) return 0;
  const docSet = new Set(docTokens);
  let matchCount = 0;
  for (const qt of queryTokens) {
    if (docSet.has(qt)) {
      matchCount += 1.5;
    } else {
      for (const dt of docSet) {
        if (dt.includes(qt) || qt.includes(dt)) {
          matchCount += 0.6;
          break;
        }
      }
    }
  }
  return matchCount / Math.max(queryTokens.length, 1);
}

// Parse seconds from query like "00:18" or "18s" or "at 25 seconds"
function extractTimeSeconds(query) {
  const matchMMSS = query.match(/\b([0-5]?[0-9]):([0-5][0-9])\b/);
  if (matchMMSS) {
    return parseInt(matchMMSS[1], 10) * 60 + parseInt(matchMMSS[2], 10);
  }
  const matchSec = query.match(/\b([0-9]+)\s*(?:s|sec|seconds)\b/i);
  if (matchSec) {
    return parseInt(matchSec[1], 10);
  }
  return null;
}

export const ragService = {
  getDocuments() {
    const analyzed = storageService.getAnalyzedEvents();
    const allVideos = videoService.getAllVideos();

    const videoMap = new Map();
    for (const v of allVideos) {
      videoMap.set(v.id, v);
      videoMap.set(v.file_name, v);
      if (v.stem) videoMap.set(v.stem, v);
      if (v.clip_id) videoMap.set(v.clip_id, v);
    }

    const docs = [];

    for (const ev of analyzed) {
      if (ev.status === 'failed') continue;
      const vid = videoMap.get(ev.clip_id) || videoMap.get(ev.file_name) || videoMap.get(ev.stem);

      const timelineText = (ev.timeline || [])
        .map((t) => `[${t.startTime || '00:00'}-${t.endTime || '00:00'}] ${t.action} (${(t.entities || []).join(', ')})`)
        .join(' ');

      const textContent = [
        ev.clip_id,
        ev.file_name,
        ev.category,
        ev.subcategory,
        ev.event,
        ev.description,
        ev.detailedDescription,
        ev.riskEvidence,
        `risk:${ev.risk}`,
        ev.unusual ? 'unusual suspicious alarm' : 'normal regular',
        (ev.objects || []).join(' '),
        (ev.entities || []).join(' '),
        timelineText,
        ev.searchableText || ''
      ].filter(Boolean).join(' ');

      docs.push({
        id: `analysis_${ev.clip_id || ev.file_name}`,
        clip_id: ev.clip_id,
        file_name: ev.file_name,
        stem: ev.stem,
        category: ev.category || ev.event,
        event: ev.event,
        risk: ev.risk,
        riskEvidence: ev.riskEvidence || '',
        unusual: Boolean(ev.unusual),
        description: ev.description,
        detailedDescription: ev.detailedDescription || ev.description,
        timeline: ev.timeline || [],
        objects: ev.objects || [],
        entities: ev.entities || ev.objects || [],
        timestamp: ev.timestamp,
        duration_sec: ev.duration_sec || 15.0,
        evidence_frames: ev.evidence_frames || vid?.evidence_frames || [],
        thumbnail_url: vid?.thumbnail_url || null,
        video_url: vid?.video_url || null,
        textContent,
        tokens: tokenize(textContent)
      });
    }

    return docs;
  },

  search(query, limit = 20) {
    if (!query || !query.trim()) {
      return this.getDocuments().slice(0, limit);
    }
    const qTokens = tokenize(query);
    const targetSec = extractTimeSeconds(query);
    const docs = this.getDocuments();

    const scored = docs.map((doc) => {
      let score = calculateScore(qTokens, doc.tokens);

      // Exact substring match boosts
      const qLower = query.toLowerCase().trim();
      if (doc.file_name?.toLowerCase().includes(qLower) || doc.clip_id?.toLowerCase() === qLower) {
        score += 3.0;
      }
      if (doc.description?.toLowerCase().includes(qLower)) {
        score += 2.0;
      }
      if (doc.riskEvidence?.toLowerCase().includes(qLower)) {
        score += 1.5;
      }

      // Timestamp matching boost
      if (targetSec !== null) {
        const hasMatchingSegment = doc.timeline.some(
          (t) => t.start_sec <= targetSec && targetSec <= t.end_sec
        );
        if (hasMatchingSegment) {
          score += 2.0;
        }
      }

      // Semantic concept matching
      if (/theft|steal|taken|stranger/i.test(query) && (doc.event === 'package_taken_by_stranger' || doc.event === 'unusual_activity')) {
        score += 2.0;
      }
      if (/delivery|package|box|courier/i.test(query) && (doc.event?.includes('package') || doc.event?.includes('delivery'))) {
        score += 1.5;
      }
      if (/lingering|waiting|loitering/i.test(query) && doc.event === 'person_lingering') {
        score += 2.0;
      }
      if (/visitor|guest|arrival/i.test(query) && doc.event === 'visitor_at_door') {
        score += 1.5;
      }

      return { doc, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored
      .filter((s) => s.score > 0.05)
      .slice(0, limit)
      .map((s) => ({
        ...s.doc,
        match_score: roundNumber(s.score, 2),
        snippet: getRelevantSnippet(s.doc, query)
      }));
  },

  retrieve(query, topK = 6) {
    const qTokens = tokenize(query);
    const docs = this.getDocuments();

    if (!docs.length) return [];

    const targetSec = extractTimeSeconds(query);

    const scored = docs.map((doc) => {
      let score = calculateScore(qTokens, doc.tokens);

      const qLower = query.toLowerCase();
      if (doc.file_name?.toLowerCase().includes(qLower) || doc.clip_id?.toLowerCase() === qLower) {
        score += 2.5;
      }
      if (doc.description?.toLowerCase().includes(qLower)) {
        score += 1.5;
      }

      if (targetSec !== null) {
        const hasMatchingSegment = doc.timeline.some(
          (t) => t.start_sec <= targetSec && targetSec <= t.end_sec
        );
        if (hasMatchingSegment) score += 2.0;
      }

      if (/theft|stole|take|stranger/i.test(query) && doc.event === 'package_taken_by_stranger') {
        score += 2.0;
      }
      if (/high risk|threat|danger|alarm/i.test(query) && doc.risk === 'high') {
        score += 1.2;
      }
      if (/deliver|package|carrier|box/i.test(query) && (doc.event?.includes('package') || doc.event?.includes('delivery'))) {
        score += 1.2;
      }

      return { doc, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const filtered = scored.filter((s) => s.score > 0.05).slice(0, topK);
    return (filtered.length ? filtered : scored.slice(0, 3)).map((s) => s.doc);
  },

  async askGroq(query, history = []) {
    const retrievedDocs = this.retrieve(query, 5);
    const apiKey = process.env.GROQ_API_KEY;

    // Build concise, rich context including timestamps and timeline segments
    const contextLines = retrievedDocs.map((doc, idx) => {
      const timelineSnippets = doc.timeline.slice(0, 4).map(
        (t) => `${t.startTime}-${t.endTime}: ${t.action}`
      ).join('; ');

      return `[Clip #${idx + 1}] ID: ${doc.clip_id} | File: ${doc.file_name} | Event: ${doc.event} | Risk: ${doc.risk} | Duration: ${doc.duration_sec}s
Summary: "${doc.description}"
Evidence: "${doc.riskEvidence || 'Standard baseline activity'}"
Entities: ${(doc.entities || []).join(', ')}
Timeline: ${timelineSnippets || 'N/A'}`;
    });

    const contextText = contextLines.length > 0
      ? contextLines.join('\n\n')
      : 'No analyzed video events found in library storage.';

    const systemPrompt = `You are the AI Intelligence Assistant for the AegisVision Video Intelligence Platform.
Your role is to answer questions about security and doorbell footage based STRICTLY on the retrieved video records below.

Strict instructions:
1. Base your answer ONLY on the provided retrieved records. Do NOT invent events, crimes, timestamps, or people that are not in the context.
2. When answering, cite the clip ID or filename explicitly (e.g. [D-01] or [delivery-01.mp4]).
3. When referencing actions or time, provide specific timestamps (e.g. at 00:08).
4. If asked about risk, explain whether it is "low" or "high" and state the exact evidence.
5. If the stored analysis does not establish the answer, state clearly: "The stored video analysis does not establish [answer]."
6. Format answers cleanly with markdown bullets and bold timestamps.`;

    const citations = retrievedDocs.map((d) => ({
      clip_id: d.clip_id,
      file_name: d.file_name,
      event: d.event,
      category: d.category,
      risk: d.risk,
      unusual: d.unusual,
      description: d.description,
      timeline: d.timeline,
      evidence_frames: d.evidence_frames || [],
      thumbnail_url: d.thumbnail_url || null,
      video_url: d.video_url || null
    }));

    if (!apiKey) {
      const response = this.generateFallbackAnswer(query, retrievedDocs);
      return {
        answer: response,
        citations,
        model: 'Neural Vision Intelligence Core',
        grounded: true,
        notice: 'Offline grounded retrieval active. Add API key in .env for generative reasoning.'
      };
    }

    try {
      const groq = new Groq({ apiKey });

      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-4).map((h) => ({
          role: h.sender === 'user' ? 'user' : 'assistant',
          content: h.text
        })),
        { role: 'user', content: query }
      ];

      const completion = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages,
        temperature: 0.1,
        max_tokens: 500
      });

      const answer = completion.choices[0]?.message?.content || 'No response generated.';
      return {
        answer,
        citations,
        model: 'AegisVision Neural Engine',
        grounded: true
      };
    } catch (err) {
      console.error('LLM Inference Error:', err.message);
      const fallback = this.generateFallbackAnswer(query, retrievedDocs);
      return {
        answer: `${fallback}\n\n*(Note: Grounded factual response retrieved from verified database records).*`,
        citations,
        model: 'Neural Retrieval Fallback',
        grounded: true,
        error: err.message
      };
    }
  },

  async askVideo(clipId, query, history = []) {
    const docs = this.getDocuments();
    const stem = path.parse(clipId).name;
    const doc = docs.find((d) => 
      d.clip_id === clipId || 
      d.file_name === clipId || 
      d.id === clipId || 
      d.clip_id === stem ||
      d.file_name === `${stem}.mp4`
    );

    if (!doc) {
      return {
        answer: `Video record for "${clipId}" was not found in the indexed database.`,
        citations: [],
        model: 'Neural Vision Core',
        grounded: false
      };
    }

    const timelineText = (doc.timeline || []).map((t) => 
      `- [${t.startTime} - ${t.endTime}]: ${t.action}${t.observations ? ` (Visual observations: ${t.observations})` : ''}${t.entities?.length ? ` (Entities: ${t.entities.join(', ')})` : ''}`
    ).join('\n');

    const videoContext = `=== VIDEO DOSSIER: ${doc.file_name} (ID: ${doc.clip_id}) ===
Event Type: ${doc.event}
Category: ${doc.category || doc.event} (${doc.subcategory || 'Security footage'})
Assessed Risk: ${doc.risk.toUpperCase()}
Risk Evidence: ${doc.riskEvidence || 'Standard surveillance activity'}
Executive Summary: ${doc.description}
Detailed Narrative: ${doc.detailedDescription || doc.description}
Visible Objects & Entities: ${(doc.entities || []).join(', ') || 'N/A'}
Duration: ${doc.duration_sec}s
Peak Activity Second: ${doc.peak_time_seconds ? `${doc.peak_time_seconds}s` : 'N/A'}
Peak Keyframe: ${doc.peak_frame || 'N/A'}

=== CHRONOLOGICAL TIMELINE SEGMENTS ===
${timelineText || 'No detailed timeline segments available.'}`;

    const systemPrompt = `You are the specialized AI Video Forensic Assistant for this specific security camera clip: "${doc.file_name}".
Your task is to answer user inquiries about this video in detail, with extreme factual precision.

Rules:
1. Base your answer STRICTLY on the provided video dossier and timeline segments above.
2. Whenever you mention a specific moment or action, always cite the timestamp in square brackets like [00:04] or [00:01 - 00:03] so the user can seek to it.
3. If asked about what a person did, what objects were visible, why it's high/low risk, or the sequence of events, describe it clearly in chronological order.
4. If a detail is not visible or established in the video data, explicitly state: "The video telemetry does not establish [detail]."
5. Use markdown formatting with bullet points and bold timestamps for readability.`;

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return {
        answer: `**Analysis for ${doc.file_name}**:\n• **Event**: ${doc.category || doc.event}\n• **Summary**: ${doc.description}\n• **Risk**: ${doc.risk.toUpperCase()} (${doc.riskEvidence || 'Standard activity'})\n• **Visible Objects**: ${(doc.entities || []).join(', ')}\n\n*Timeline Highlights*:\n${(doc.timeline || []).slice(0, 4).map(t => `• [${t.startTime}] ${t.action}`).join('\n')}`,
        citations: [{
          clip_id: doc.clip_id,
          file_name: doc.file_name,
          event: doc.event,
          risk: doc.risk,
          timeline: doc.timeline
        }],
        model: 'Local Forensic Core',
        grounded: true
      };
    }

    try {
      const groq = new Groq({ apiKey });
      const messages = [
        { role: 'system', content: `${systemPrompt}\n\n${videoContext}` },
        ...history.slice(-4).map((h) => ({
          role: h.sender === 'user' ? 'user' : 'assistant',
          content: h.text
        })),
        { role: 'user', content: query }
      ];

      const completion = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages,
        temperature: 0.1,
        max_tokens: 600
      });

      const answer = completion.choices[0]?.message?.content || 'No response generated.';

      return {
        answer,
        clip_id: doc.clip_id,
        file_name: doc.file_name,
        citations: [{
          clip_id: doc.clip_id,
          file_name: doc.file_name,
          event: doc.event,
          risk: doc.risk,
          timeline: doc.timeline,
          thumbnail_url: doc.thumbnail_url,
          video_url: doc.video_url
        }],
        model: 'Groq GPT-OSS 120B Video RAG',
        grounded: true
      };
    } catch (err) {
      console.error('Video RAG Error:', err.message);
      return {
        answer: `**${doc.file_name} Intelligence Summary**:\n• **Classification**: ${doc.category || doc.event}\n• **Risk Level**: ${doc.risk} (${doc.riskEvidence || 'Standard event'})\n• **Observation**: ${doc.description}\n\n*Relevant Timeline*:\n${(doc.timeline || []).slice(0, 4).map(t => `• [${t.startTime}] ${t.action}`).join('\n')}`,
        clip_id: doc.clip_id,
        file_name: doc.file_name,
        citations: [{
          clip_id: doc.clip_id,
          file_name: doc.file_name,
          event: doc.event,
          risk: doc.risk,
          timeline: doc.timeline
        }],
        model: 'Forensic Fallback Engine',
        grounded: true,
        error: err.message
      };
    }
  },

  generateFallbackAnswer(query, docs) {
    if (!docs.length) {
      return "The stored video analysis does not establish an answer for that query because no matching video records were found in the library database.";
    }

    const q = query.toLowerCase();
    const targetSec = extractTimeSeconds(query);

    if (targetSec !== null) {
      // Find timeline segment matching targetSec
      for (const d of docs) {
        const seg = d.timeline.find((t) => t.start_sec <= targetSec && targetSec <= t.end_sec);
        if (seg) {
          return `At **${seg.startTime} - ${seg.endTime}** in [${d.clip_id || d.file_name}]:\n• Action: ${seg.action}\n• Entities: ${(seg.entities || []).join(', ') || 'N/A'}\n• Context: ${d.description} (Risk: ${d.risk})`;
        }
      }
    }

    if (q.includes('theft') || q.includes('stranger') || q.includes('stole')) {
      const thefts = docs.filter((d) => d.event === 'package_taken_by_stranger' || d.risk === 'high');
      return `Identified ${thefts.length} potential incident(s) involving package removal or high-risk activity:\n` +
        thefts.map((d) => `• **[${d.clip_id}] ${d.file_name}**: ${d.description} (Risk: ${d.risk.toUpperCase()})`).join('\n');
    }

    if (q.includes('deliver') || q.includes('package')) {
      const deliveries = docs.filter((d) => d.event?.includes('delivered') || d.event?.includes('package'));
      return `Found ${deliveries.length} package delivery or retrieval event(s):\n` +
        deliveries.map((d) => `• **[${d.clip_id}] ${d.file_name}**: ${d.description} (Risk: ${d.risk})`).join('\n');
    }

    if (q.includes('risk') || q.includes('danger') || q.includes('threat')) {
      const highRisk = docs.filter((d) => d.risk === 'high');
      return `Found ${highRisk.length} high-risk alert(s):\n` +
        highRisk.map((d) => `• **[${d.clip_id}] ${d.file_name}**: ${d.description}\n  Evidence: ${d.riskEvidence || 'Suspicious behavior detected'}`).join('\n');
    }

    return `Based on ${docs.length} retrieved record(s):\n` +
      docs.map((d) => `• **[${d.clip_id}] ${d.file_name}** (${d.category || d.event}): ${d.description}`).join('\n');
  }
};

function roundNumber(num, dec = 2) {
  return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
}

function getRelevantSnippet(doc, query) {
  const qTerms = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const desc = doc.description || '';
  for (const term of qTerms) {
    const idx = desc.toLowerCase().indexOf(term);
    if (idx >= 0) {
      const start = Math.max(0, idx - 40);
      const end = Math.min(desc.length, idx + 80);
      return (start > 0 ? '...' : '') + desc.slice(start, end) + (end < desc.length ? '...' : '');
    }
  }
  return desc;
}
