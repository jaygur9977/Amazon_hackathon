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
    const qLower = (query || '').toLowerCase();

    const scored = docs.map((doc) => {
      let score = calculateScore(qTokens, doc.tokens);

      const fileLower = (doc.file_name || '').toLowerCase();
      const clipLower = (doc.clip_id || '').toLowerCase();
      const stemLower = (doc.stem || '').toLowerCase();

      // Strong boost for explicit clip ID or filename mention
      if (qLower.includes(fileLower) || (clipLower && qLower.includes(clipLower)) || (stemLower && qLower.includes(stemLower))) {
        score += 8.0;
      }

      // Check description & riskEvidence match
      if (doc.description && doc.description.toLowerCase().includes(qLower)) {
        score += 2.5;
      }
      if (doc.riskEvidence && doc.riskEvidence.toLowerCase().includes(qLower)) {
        score += 2.0;
      }

      // Timestamp matching boost
      if (targetSec !== null) {
        const hasMatchingSegment = doc.timeline.some(
          (t) => t.start_sec <= targetSec && targetSec <= t.end_sec
        );
        if (hasMatchingSegment) score += 3.0;
      }

      // Semantic concept matching
      if (/theft|stole|steal|taken|stranger|handbag|take items|removal/i.test(query)) {
        if (doc.event === 'package_taken_by_stranger' || doc.category?.toLowerCase().includes('theft') || doc.category?.toLowerCase().includes('taken')) {
          score += 3.5;
        }
      }
      if (/high risk|threat|danger|alarm|security incident|severe|critical/i.test(query)) {
        if (doc.risk === 'high') score += 2.5;
      }
      if (/deliver|courier|carrier|package drop|parcel/i.test(query)) {
        if (doc.event?.includes('delivered') || doc.event?.includes('package') || doc.category?.toLowerCase().includes('deliver')) {
          score += 2.0;
        }
      }
      if (/pickup|collected|collect|resident/i.test(query)) {
        if (doc.event?.includes('collected') || doc.event?.includes('pickup')) {
          score += 2.5;
        }
      }
      if (/visitor|guest|arrival|porch|doorbell|ring/i.test(query)) {
        if (doc.event === 'visitor_at_door' || doc.category?.toLowerCase().includes('visitor')) {
          score += 2.5;
        }
      }
      if (/lingering|loitering|waiting|idle|standing/i.test(query)) {
        if (doc.event === 'person_lingering' || doc.description?.toLowerCase().includes('linger')) {
          score += 2.5;
        }
      }
      if (/unusual|abnormal|suspicious/i.test(query)) {
        if (doc.unusual || doc.event === 'unusual_activity') {
          score += 2.0;
        }
      }
      if (/summar|overview|important|key events|highlights/i.test(query)) {
        // Broad summary boosts high-risk and eventful clips
        if (doc.risk === 'high') score += 1.5;
        if (doc.unusual) score += 1.0;
      }

      return { doc, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const filtered = scored.filter((s) => s.score > 0.05).slice(0, topK);
    return (filtered.length ? filtered : scored.slice(0, topK)).map((s) => s.doc);
  },

  async askGroq(query, history = []) {
    const allDocs = this.getDocuments();
    const retrievedDocs = this.retrieve(query, 6);
    const apiKey = process.env.GROQ_API_KEY;

    // 1. Build a high-level library overview so the model knows the aggregate truth
    const totalClips = allDocs.length;
    const categoryCounts = {};
    let highRiskCount = 0;
    const highRiskClips = [];

    for (const d of allDocs) {
      const cat = d.category || d.event || 'Other';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      if (d.risk === 'high') {
        highRiskCount++;
        highRiskClips.push(`[${d.clip_id}] ${d.file_name} (${cat}: ${d.riskEvidence || d.description})`);
      }
    }

    const libraryOverview = `Total analyzed surveillance clips in repository: ${totalClips}
High-risk clips (${highRiskCount}): ${highRiskClips.join('; ')}
Event category distribution: ${Object.entries(categoryCounts).map(([c, n]) => `${c}: ${n}`).join(', ')}`;

    // 2. Build concise, rich context for retrieved clips including timestamps and timeline segments
    const contextLines = retrievedDocs.map((doc, idx) => {
      const timelineSnippets = (doc.timeline || []).slice(0, 8).map(
        (t) => `[${t.startTime}-${t.endTime}] ${t.action}${t.observations ? ` (obs: ${t.observations})` : ''}`
      ).join('; ');

      return `--- CLIP #${idx + 1}: [${doc.clip_id}] ${doc.file_name} ---
Category: ${doc.category || doc.event} | Risk Level: ${doc.risk.toUpperCase()}
Risk Evidence: "${doc.riskEvidence || 'Standard baseline activity'}"
Summary: "${doc.description}"
Visible Entities/Objects: ${(doc.entities || []).join(', ') || 'N/A'}
Recorded Duration: ${doc.duration_sec}s
Timeline Progression:
${timelineSnippets || 'N/A'}`;
    });

    const contextText = contextLines.length > 0
      ? contextLines.join('\n\n')
      : 'No matching video events found in library storage.';

    const systemPrompt = `You are the AI Video Intelligence Assistant for the AegisVision Video Intelligence Platform.
Your duty is to answer questions about security and doorbell footage based STRICTLY and FAITHFULLY on the retrieved video records and library statistics provided below.

=== REPOSITORY SUMMARY ===
${libraryOverview}

=== RETRIEVED VIDEO EVIDENCE DOSSIERS ===
${contextText}

=== STRICT INSTRUCTIONS ===
1. Direct, specific answers: Address the user's current question directly. Do NOT repeat a generic canned template or disclaimers if the evidence answers the query.
2. Grounding & Citations: Base every factual claim on the evidence above. When referring to a clip, cite its bracketed ID like [D-01] or [delivery-01.mp4].
3. Timestamps: Whenever discussing actions, movements, or specific occurrences, cite exact timestamps in bracketed format like [00:08] or [00:02 - 00:05].
4. Risk explanations: When asked why an event is high risk, explain the exact evidence (e.g. unauthorized removal, vehicle breach, loitering).
5. Distinguish facts from interpretation: Clearly distinguish what was visually recorded (e.g., "A person visible on porch") from deductions.
6. Uncertainty & negative constraints: If the records do not contain information to answer a part of the question, state honestly what is and is not recorded. Never invent clips, crimes, or people.
7. Formatting: Use clean markdown with bullet points, bold timestamps, and bold clip IDs for readability.`;

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
      const response = this.generateFallbackAnswer(query, retrievedDocs, allDocs);
      return {
        answer: response,
        citations,
        model: 'Neural Vision Intelligence Core (Offline Mode)',
        grounded: true,
        notice: 'Offline grounded retrieval active. Add GROQ_API_KEY in backend/.env for neural LLM reasoning.'
      };
    }

    try {
      const groq = new Groq({ apiKey });

      // Clean conversation history to avoid stale turns overriding current question
      const cleanHistory = (history || [])
        .slice(-6)
        .filter((h) => h && h.text && typeof h.text === 'string' && h.text.trim())
        .map((h) => ({
          role: h.sender === 'user' ? 'user' : 'assistant',
          content: h.text.trim()
        }));

      const messages = [
        { role: 'system', content: systemPrompt },
        ...cleanHistory,
        { role: 'user', content: query }
      ];

      const completion = await groq.chat.completions.create({
        model: 'openai/gpt-oss-120b',
        messages,
        temperature: 0.1,
        max_tokens: 1000
      });

      const answer = completion.choices[0]?.message?.content || 'No response generated.';
      return {
        answer,
        citations,
        model: 'AegisVision Neural Engine (GPT-OSS 120B)',
        grounded: true
      };
    } catch (err) {
      console.error('LLM Inference Error:', err.message);
      const fallback = this.generateFallbackAnswer(query, retrievedDocs, allDocs);
      return {
        answer: fallback,
        citations,
        model: 'AegisVision Neural Fallback',
        grounded: true,
        notice: `API connection notice: ${err.message}. Factual answer synthesized directly from verified database telemetry.`
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

  generateFallbackAnswer(query, docs, allDocs = []) {
    if (!docs.length) {
      return "The stored video analysis does not establish an answer for that query because no matching video records were found in the library database.";
    }

    const q = (query || '').toLowerCase();
    const targetSec = extractTimeSeconds(query);

    // 1. Specific timestamp inquiry
    if (targetSec !== null) {
      const matches = [];
      for (const d of docs) {
        const seg = (d.timeline || []).find((t) => t.start_sec <= targetSec && targetSec <= t.end_sec);
        if (seg) {
          matches.push(`• **[${d.clip_id}] ${d.file_name}** at [${seg.startTime} - ${seg.endTime}]: ${seg.action}${seg.observations ? ` (${seg.observations})` : ''} [Risk: ${d.risk.toUpperCase()}]`);
        }
      }
      if (matches.length > 0) {
        return `Recorded video activity at timestamp **${formatSecondsToTime(targetSec)}**:\n\n${matches.join('\n\n')}`;
      }
      return `No specific motion segment was cataloged at exactly ${formatSecondsToTime(targetSec)} in the top matching clips, but here is the closest timeline activity:\n` +
        docs.slice(0, 3).map((d) => `• **[${d.clip_id}] ${d.file_name}**: ${(d.timeline || []).slice(0, 2).map((t) => `[${t.startTime}] ${t.action}`).join('; ')}`).join('\n');
    }

    // 2. High risk / threats inquiry
    if (/high risk|threat|danger|alarm|severe|why was.*risk/i.test(q)) {
      const highRisk = docs.filter((d) => d.risk === 'high');
      if (highRisk.length > 0) {
        return `### High-Risk Security Findings\n\n` +
          highRisk.map((d) => 
            `• **[${d.clip_id}] ${d.file_name}** (${d.category || d.event}):\n` +
            `  - **Risk Assessment**: HIGH\n` +
            `  - **Evidence**: ${d.riskEvidence || d.description}\n` +
            `  - **Timeline Evidence**: ${(d.timeline || []).slice(0, 3).map(t => `[${t.startTime}] ${t.action}`).join(', ')}`
          ).join('\n\n');
      }
      return `None of the top retrieved clips for this query were classified as high-risk. Stored records classify these as low-risk standard activity.`;
    }

    // 3. Package removal / theft inquiry
    if (/theft|stole|take|stranger|removal|stolen|package removal/i.test(q)) {
      const thefts = docs.filter((d) => d.event === 'package_taken_by_stranger' || d.category?.toLowerCase().includes('theft') || d.risk === 'high');
      if (thefts.length > 0) {
        return `### Identified Potential Package Removal / Incident Clips\n\n` +
          thefts.map((d) => 
            `• **[${d.clip_id}] ${d.file_name}** (${d.category || d.event}):\n` +
            `  - **Incident Summary**: ${d.description}\n` +
            `  - **Risk**: ${d.risk.toUpperCase()} (${d.riskEvidence || 'Unauthorized package removal'})\n` +
            `  - **Action at Peak**: ${(d.timeline || []).filter(t => t.action.includes('progress') || t.action.includes('Person')).map(t => `[${t.startTime}] ${t.action}`).join('; ') || 'Event captured in frame'}`
          ).join('\n\n');
      }
      return `The retrieved records do not contain evidence of unauthorized package removal or theft for this search.`;
    }

    // 4. Deliveries / Courier inquiry
    if (/deliver|courier|carrier|drop off|parcel/i.test(q)) {
      const deliveries = docs.filter((d) => d.event?.includes('delivered') || d.event?.includes('package') || d.category?.toLowerCase().includes('deliver'));
      return `### Package Delivery Records\n\n` +
        `Found ${deliveries.length} delivery-related event(s) in retrieved evidence:\n\n` +
        deliveries.map((d) => 
          `• **[${d.clip_id}] ${d.file_name}** (${d.category || d.event}):\n` +
          `  - **Summary**: ${d.description}\n` +
          `  - **Risk**: ${d.risk.toUpperCase()} (${d.riskEvidence || 'Standard delivery'})\n` +
          `  - **Key Moments**: ${(d.timeline || []).slice(0, 3).map(t => `[${t.startTime}] ${t.action}`).join(' → ')}`
        ).join('\n\n');
    }

    // 5. Visitor / Door interactions
    if (/visitor|guest|arrival|porch|doorbell|action/i.test(q)) {
      return `### Visitor & Entryway Actions\n\n` +
        docs.map((d) => 
          `• **[${d.clip_id}] ${d.file_name}** (${d.category || d.event}):\n` +
          `  - **Visitor Actions**: ${d.description}\n` +
          `  - **Entities Observed**: ${(d.entities || []).join(', ') || 'person'}\n` +
          `  - **Timeline**: ${(d.timeline || []).slice(0, 3).map(t => `[${t.startTime}] ${t.action}`).join('; ')}`
        ).join('\n\n');
    }

    // 6. Summary / Overview inquiry
    if (/summar|important|overview|today|all events|highlights/i.test(q)) {
      const highRisk = docs.filter(d => d.risk === 'high');
      const normal = docs.filter(d => d.risk !== 'high');
      let out = `### Surveillance Intelligence Summary\n\n`;
      if (highRisk.length > 0) {
        out += `**⚠️ Prioritized High-Risk Incidents (${highRisk.length}):**\n` +
          highRisk.map(d => `• **[${d.clip_id}] ${d.file_name}**: ${d.description} (Evidence: ${d.riskEvidence})`).join('\n') + `\n\n`;
      }
      out += `**Standard Activity & Low-Risk Events (${normal.length}):**\n` +
        normal.map(d => `• **[${d.clip_id}] ${d.file_name}** (${d.category || d.event}): ${d.description}`).join('\n');
      return out;
    }

    // Default question-focused synthesis based on retrieved documents
    return `### Analysis for: "${query}"\n\n` +
      `Based on verified surveillance records:\n\n` +
      docs.map((d) => 
        `• **[${d.clip_id}] ${d.file_name}** (${d.category || d.event}):\n` +
        `  - **Details**: ${d.description}\n` +
        `  - **Risk Assessment**: ${d.risk.toUpperCase()} (${d.riskEvidence || 'Standard baseline activity'})\n` +
        `  - **Timeline Progression**: ${(d.timeline || []).slice(0, 3).map(t => `[${t.startTime}] ${t.action}`).join('; ')}`
      ).join('\n\n');
  }
};

function formatSecondsToTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

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
