import { 
  VideoClip, 
  AnalysisJob, 
  AnalysisResult, 
  DashboardStats, 
  ChatMessage, 
  RAGCitation,
  DetectionData,
  DailySummaryItem,
  CloudConnector
} from '../types';

const API_BASE = '/api';

export const api = {
  async getVideos(): Promise<{ count: number; videos: VideoClip[] }> {
    const res = await fetch(`${API_BASE}/videos`);
    if (!res.ok) throw new Error(`Failed to fetch videos: ${res.statusText}`);
    return res.json();
  },

  async getVideo(id: string): Promise<VideoClip> {
    const res = await fetch(`${API_BASE}/videos/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`Failed to fetch video: ${res.statusText}`);
    const data = await res.json();
    return data.video;
  },

  async getVideoDetections(id: string): Promise<DetectionData> {
    const res = await fetch(`${API_BASE}/videos/${encodeURIComponent(id)}/detections`);
    if (!res.ok) throw new Error(`Failed to fetch detections: ${res.statusText}`);
    const data = await res.json();
    return data.detection;
  },

  async searchVideos(query: string, limit = 20): Promise<{ count: number; results: any[] }> {
    const res = await fetch(`${API_BASE}/videos/search?q=${encodeURIComponent(query)}&limit=${limit}`);
    if (!res.ok) throw new Error(`Search request failed: ${res.statusText}`);
    return res.json();
  },

  async getCloudConnectors(): Promise<{ connectors: CloudConnector[] }> {
    const res = await fetch(`${API_BASE}/videos/cloud-connectors`);
    if (!res.ok) throw new Error(`Failed to fetch cloud connectors: ${res.statusText}`);
    return res.json();
  },

  async ingestRemoteUrl(url: string, title?: string): Promise<{ success: boolean; message: string; video: VideoClip }> {
    const res = await fetch(`${API_BASE}/videos/ingest-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, title })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to ingest URL');
    }
    return data;
  },

  async startAnalysis(videoIds: string[]): Promise<AnalysisJob> {
    const res = await fetch(`${API_BASE}/analysis/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_ids: videoIds })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Failed to start analysis job');
    }
    const data = await res.json();
    return data.job;
  },

  async getJobs(): Promise<AnalysisJob[]> {
    const res = await fetch(`${API_BASE}/analysis/jobs`);
    if (!res.ok) throw new Error('Failed to fetch jobs');
    const data = await res.json();
    return data.jobs;
  },

  async getJob(jobId: string): Promise<AnalysisJob> {
    const res = await fetch(`${API_BASE}/analysis/jobs/${encodeURIComponent(jobId)}`);
    if (!res.ok) throw new Error('Failed to fetch job');
    const data = await res.json();
    return data.job;
  },

  getJobEventSource(jobId: string): EventSource {
    return new EventSource(`${API_BASE}/analysis/jobs/${encodeURIComponent(jobId)}/events`);
  },

  async getAnalysisResults(): Promise<AnalysisResult[]> {
    const res = await fetch(`${API_BASE}/analysis/results`);
    if (!res.ok) throw new Error('Failed to fetch analysis results');
    const data = await res.json();
    return data.results;
  },

  async getAnalysisResult(id: string): Promise<AnalysisResult> {
    const res = await fetch(`${API_BASE}/analysis/results/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Failed to fetch analysis result');
    const data = await res.json();
    return data.result;
  },

  async retryAnalysis(id: string): Promise<AnalysisJob> {
    const res = await fetch(`${API_BASE}/analysis/results/${encodeURIComponent(id)}/retry`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to retry analysis');
    const data = await res.json();
    return data.job;
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/dashboard/stats`);
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    const data = await res.json();
    return data.stats;
  },

  async getDailySummaries(date?: string, risk?: string): Promise<{ available_dates: string[]; summaries: DailySummaryItem[] }> {
    const params = new URLSearchParams();
    if (date && date !== 'all') params.append('date', date);
    if (risk && risk !== 'all') params.append('risk', risk);
    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/dashboard/daily-summary${queryStr}`);
    if (!res.ok) throw new Error('Failed to fetch daily summaries');
    return res.json();
  },

  async askAssistant(message: string, history: ChatMessage[]): Promise<{
    answer: string;
    citations: RAGCitation[];
    model: string;
    grounded: boolean;
    notice?: string;
  }> {
    const res = await fetch(`${API_BASE}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Failed to consult AI assistant');
    }
    return res.json();
  },

  async askVideo(
    id: string,
    question: string,
    history: { sender: string; text: string }[] = []
  ): Promise<{
    answer: string;
    citations: RAGCitation[];
    model: string;
    grounded: boolean;
  }> {
    const res = await fetch(`${API_BASE}/videos/${encodeURIComponent(id)}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, history })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Failed to query video intelligence');
    }
    return res.json();
  },

  async deleteVideo(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/videos/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Failed to delete video');
    }
    return res.json();
  },

  async clearProcessingJobs(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/analysis/jobs/clear-processing`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Failed to clear jobs');
    }
    return res.json();
  },

  async getSources(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/assistant/sources`);
    if (!res.ok) throw new Error('Failed to fetch assistant sources');
    const data = await res.json();
    return data.sources;
  }
};
