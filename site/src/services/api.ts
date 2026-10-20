import { VideoClip, AnalysisJob, AnalysisResult, DashboardStats, ChatMessage, RAGCitation } from '../types';

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

  async getSources(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/assistant/sources`);
    if (!res.ok) throw new Error('Failed to fetch assistant sources');
    const data = await res.json();
    return data.sources;
  }
};
