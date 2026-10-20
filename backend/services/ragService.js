import Groq from 'groq-sdk';
import { storageService } from './storageService.js';
import { videoService } from './videoService.js';

function tokenize(text) {
  if (!text) return [];
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function calculateScore(queryTokens, docTokens) {
  if (!queryTokens.length || !docTokens.length) return 0;
  const docSet = new Set(docTokens);
  let matchCount = 0;
  for (const qt of queryTokens) {
    if (docSet.has(qt)) matchCount++;
    // partial match bonus
    for (const dt of docSet) {
      if (dt.includes(qt) || qt.includes(dt)) {
        matchCount += 0.5;
        break;
      }
    }
  }
  return matchCount / Math.max(queryTokens.length, 1);
}

export const ragService = {
  getDocuments() {
    const analyzed = storageService.getAnalyzedEvents();
    const groundTruth = storageService.getGroundTruthEvents();
    const allVideos = videoService.getAllVideos();

    const videoMap = new Map();
    for (const v of allVideos) {
      videoMap.set(v.id, v);
      videoMap.set(v.file_name, v);
    }

    const docs = [];

    // 1. Indexed analyzed records (primary source)
    for (const ev of analyzed) {
      if (ev.status === 'failed') continue;
      const vid = videoMap.get(ev.clip_id) || videoMap.get(ev.file_name);
      const textContent = `${ev.description || ''} ${ev.event || ''} ${(ev.objects || []).join(' ')} risk:${ev.risk || 'low'} unusual:${ev.unusual ? 'yes' : 'no'} bucket:${ev.bucket || ''} file:${ev.file_name || ''}`;
      
      docs.push({
        id: `analysis_${ev.clip_id || ev.file_name}`,
        clip_id: ev.clip_id,
        file_name: ev.file_name,
        type: 'model_analysis',
        event: ev.event,
        risk: ev.risk,
        unusual: Boolean(ev.unusual),
        description: ev.description,
        objects: ev.objects || [],
        timestamp: ev.timestamp,
        evidence_frames: ev.evidence_frames || vid?.evidence_frames || [],
        thumbnail_url: vid?.thumbnail_url || null,
        video_url: vid?.video_url || null,
        textContent,
        tokens: tokenize(textContent)
      });
    }

    // 2. Ground truth records (labeled references)
    for (const gt of groundTruth) {
      // If already has analyzed document, note GT reference, else index as GT
      const vid = videoMap.get(gt.clip_id) || videoMap.get(gt.file_name);
      const textContent = `${gt.description || ''} ${gt.event || ''} ${(gt.objects || []).join(' ')} ground-truth verified label bucket:${gt.bucket || ''} file:${gt.file_name || ''}`;
      
      docs.push({
        id: `ground_truth_${gt.clip_id || gt.file_name}`,
        clip_id: gt.clip_id,
        file_name: gt.file_name,
        type: 'ground_truth_label',
        event: gt.event,
        risk: gt.risk,
        unusual: Boolean(gt.unusual),
        description: gt.description,
        objects: gt.objects || [],
        timestamp: gt.timestamp,
        evidence_frames: vid?.evidence_frames || [],
        thumbnail_url: vid?.thumbnail_url || null,
        video_url: vid?.video_url || null,
        textContent,
        tokens: tokenize(textContent)
      });
    }

    return docs;
  },

  retrieve(query, topK = 6) {
    const queryTokens = tokenize(query);
    const docs = this.getDocuments();

    if (!docs.length) {
      return [];
    }

    // If query is broad (e.g. "summarize all", "how many"), return all relevant unique clips
    const isBroad = /all|summar|every|how many|total|status|list/i.test(query);

    const scored = docs.map((doc) => {
      let score = calculateScore(queryTokens, doc.tokens);
      // Boost high risk or unusual when asked
      if (/risk|threat|danger|alarm/i.test(query) && doc.risk === 'high') {
        score += 1.0;
      }
      if (/unusual|suspicious|stranger|theft|lingering/i.test(query) && doc.unusual) {
        score += 1.0;
      }
      if (/delivery|package|courier|box/i.test(query) && (doc.event?.includes('package') || doc.event?.includes('delivery'))) {
        score += 1.0;
      }
      if (/visitor|door|guest/i.test(query) && doc.event?.includes('visitor')) {
        score += 1.0;
      }
      return { doc, score };
    });

    if (isBroad) {
      // Return representative documents up to topK
      return scored.slice(0, topK).map((s) => s.doc);
    }

    scored.sort((a, b) => b.score - a.score);
    const filtered = scored.filter((s) => s.score > 0.05).slice(0, topK);
    return (filtered.length ? filtered : scored.slice(0, 3)).map((s) => s.doc);
  },

  async askGroq(query, history = []) {
    const retrievedDocs = this.retrieve(query, 6);
    const apiKey = process.env.GROQ_API_KEY;

    // Build context string from retrieved records
    const contextLines = retrievedDocs.map((doc, idx) => {
      return `[Record #${idx + 1}] ID: ${doc.clip_id} | File: ${doc.file_name} | Type: ${doc.type} | Event: ${doc.event} | Risk: ${doc.risk} | Unusual: ${doc.unusual} | Objects: ${(doc.objects || []).join(', ')} | Details: "${doc.description}"`;
    });

    const contextText = contextLines.length > 0
      ? contextLines.join('\n')
      : 'No analyzed video events found in library storage.';

    // Construct grounded prompt
    const systemPrompt = `You are the AI Intelligence Assistant for the Video Intelligence Platform.
Your role is to analyze home-security and doorbell footage events based STRICTLY on the retrieved video analysis records provided below.

Strict instructions:
1. Base your answer ONLY on the provided retrieved records. Do NOT make up footage or crimes that are not in the context.
2. For each claim, cite the relevant video filename or clip ID (e.g. [delivery-01.mp4] or [theft-02.mp4]).
3. If the user asks about risk, clearly state whether it was assessed as "low" or "high", and explain why based on the evidence.
4. Clearly distinguish between "ground_truth_label" (human verified label) and "model_analysis" (AI pipeline output).
5. If the retrieved evidence does not contain sufficient information to answer the question, state honestly that no matching video evidence was found in the indexed database.
6. Tone: professional, concise, vigilant, and explainable.

--- RETRIEVED CONTEXT ---
${contextText}
-------------------------`;

    const citations = retrievedDocs.map((d) => ({
      clip_id: d.clip_id,
      file_name: d.file_name,
      event: d.event,
      risk: d.risk,
      unusual: d.unusual,
      description: d.description,
      type: d.type,
      evidence_frames: d.evidence_frames || [],
      thumbnail_url: d.thumbnail_url || null,
      video_url: d.video_url || null
    }));

    if (!apiKey) {
      // Graceful offline RAG answer when GROQ_API_KEY is not yet populated in .env
      const response = this.generateFallbackAnswer(query, retrievedDocs);
      return {
        answer: response,
        citations,
        model: 'Neural Vision Intelligence Core',
        grounded: true,
        notice: 'Offline grounded retrieval active. Configure AI API key in .env for generative reasoning.'
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
        temperature: 0.2,
        max_tokens: 600
      });

      const answer = completion.choices[0]?.message?.content || 'No response generated.';
      return {
        answer,
        citations,
        model: 'AegisVision Neural Engine',
        grounded: true
      };
    } catch (err) {
      console.error('LLM Inference Error:', err);
      // Fallback with retrieved facts
      const fallback = this.generateFallbackAnswer(query, retrievedDocs);
      return {
        answer: `${fallback}\n\n*(Note: Showing grounded factual retrieval from indexed records).*`,
        citations,
        model: 'Neural Retrieval Fallback',
        grounded: true,
        error: err.message
      };
    }
  },

  generateFallbackAnswer(query, docs) {
    if (!docs.length) {
      return "No video records matching your query were found in the analyzed dataset. Try running an analysis on video clips in the library first.";
    }

    const q = query.toLowerCase();
    if (q.includes('deliver') || q.includes('package')) {
      const deliveries = docs.filter((d) => d.event?.includes('delivered') || d.event?.includes('package'));
      return `Found ${deliveries.length} package delivery event(s) in the database:\n` +
        deliveries.map((d) => `• **${d.file_name}**: ${d.description} (Risk: ${d.risk})`).join('\n');
    }

    if (q.includes('high risk') || q.includes('risk') || q.includes('suspicious') || q.includes('theft')) {
      const highRisk = docs.filter((d) => d.risk === 'high' || d.unusual);
      return `Identified ${highRisk.length} high-risk / unusual activity event(s):\n` +
        highRisk.map((d) => `• **${d.file_name}** [${d.event}]: ${d.description} (Risk: ${d.risk}, Unusual: ${d.unusual})`).join('\n');
    }

    if (q.includes('lingering') || q.includes('stranger')) {
      const lingering = docs.filter((d) => d.event?.includes('lingering') || d.description?.toLowerCase().includes('linger'));
      return `Found ${lingering.length} lingering / stranger event(s):\n` +
        lingering.map((d) => `• **${d.file_name}**: ${d.description}`).join('\n');
    }

    // Default overview from retrieved documents
    return `Based on ${docs.length} retrieved record(s):\n` +
      docs.map((d) => `• **${d.file_name}** (${d.event.replace(/_/g, ' ')}): ${d.description} [Risk: ${d.risk}]`).join('\n');
  }
};
