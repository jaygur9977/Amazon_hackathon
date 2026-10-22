export interface TimelineSegment {
  start_sec: number;
  end_sec: number;
  startTime: string;
  endTime: string;
  action: string;
  entities?: string[];
  observations?: string;
  confidence?: number;
  coverage_gap?: boolean;
}

export interface DetectionFrame {
  frame: string;
  t_seconds: number;
  person_boxes: [number, number, number, number][];
  motion_boxes: [number, number, number, number][];
  motion_score: number;
}

export interface DetectionData {
  clip_id: string;
  file_name: string;
  frames: DetectionFrame[];
  peak_frame?: string;
  peak_time_seconds?: number;
  stats?: {
    frames: number;
    frames_with_person: number;
    max_motion_score: number;
  };
}

export interface VideoClip {
  id: string;
  clip_id?: string;
  file_name: string;
  stem: string;
  bucket: string;
  relative_path: string | null;
  file_size_bytes: number | null;
  duration_sec: number;
  status: 'not_analyzed' | 'processing' | 'completed' | 'failed';
  has_media_file?: boolean;
  thumbnail_url: string | null;
  video_url: string | null;
  has_analysis: boolean;
  analysis: AnalysisResult | null;
  ground_truth: GroundTruthRecord | null;
  evidence_frames: string[];
  has_detections?: boolean;
  peak_time_seconds?: number | null;
  is_dataset_benchmark?: boolean;
}

export interface AnalysisResult {
  clip_id: string;
  file_name: string;
  bucket: string;
  timestamp: string;
  event: string;
  category?: string;
  subcategory?: string;
  eventSummary?: string;
  detailedDescription?: string;
  startTime?: string;
  endTime?: string;
  duration_sec?: number;
  timeline?: TimelineSegment[];
  entities?: string[];
  actions?: string[];
  objects: string[];
  risk: 'low' | 'high';
  riskEvidence?: string;
  unusual: boolean;
  description: string;
  confidence?: number;
  uncertainties?: string[];
  searchableText?: string;
  source?: string;
  evidence_frames?: string[];
  peak_frame?: string;
  peak_time_seconds?: number | null;
  detections?: DetectionData | null;
  status?: string;
  pipeline_version?: string;
  analyzed_at?: string;
  error?: string;
}

export interface GroundTruthRecord {
  clip_id: string;
  file_name: string;
  bucket: string;
  timestamp: string;
  event: string;
  objects: string[];
  risk: 'low' | 'high';
  unusual: boolean;
  description: string;
  duration_sec?: number;
}

export interface AnalysisJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  video_ids: string[];
  total_videos: number;
  completed_videos: number;
  current_video: string | null;
  stage: string;
  progress_percent: number;
  logs: string[];
  results: AnalysisResult[];
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_videos: number;
  analyzed_videos: number;
  not_analyzed_videos: number;
  failed_videos: number;
  high_risk_count: number;
  unusual_activity_count: number;
  jobs: {
    pending: number;
    processing: number;
    failed: number;
    total: number;
  };
  event_distribution: Record<string, number>;
  risk_distribution: {
    low: number;
    high: number;
  };
  recent_activity: AnalysisResult[];
}

export interface DailySummaryEvent {
  clip_id: string;
  file_name: string;
  event: string;
  category: string;
  risk: 'low' | 'high';
  riskEvidence: string;
  unusual: boolean;
  time_formatted: string;
  timestamp: string;
  duration_sec: number;
  description: string;
  evidence_frames: string[];
  timeline: TimelineSegment[];
}

export interface CategoryBreakdownItem {
  category: string;
  count: number;
  high_risk_count: number;
  clips: {
    clip_id: string;
    file_name: string;
    risk: string;
  }[];
}

export interface DailySummaryItem {
  date: string;
  total_events: number;
  unique_clips_count?: number;
  unique_clips?: string[];
  risk_distribution?: {
    high: number;
    medium?: number;
    low: number;
  };
  high_risk_count: number;
  delivery_count: number;
  visitor_count: number;
  unusual_count: number;
  plain_english_summary: string;
  category_breakdown?: CategoryBreakdownItem[];
  high_risk_events?: DailySummaryEvent[];
  chronological_timeline?: DailySummaryEvent[];
  events: DailySummaryEvent[];
}

export interface RAGCitation {
  clip_id: string;
  file_name: string;
  event: string;
  category?: string;
  risk: string;
  unusual: boolean;
  description: string;
  timeline?: TimelineSegment[];
  type?: string;
  evidence_frames: string[];
  thumbnail_url: string | null;
  video_url: string | null;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  citations?: RAGCitation[];
  model?: string;
  grounded?: boolean;
  notice?: string;
}

export interface CloudConnector {
  provider: string;
  id: string;
  status: 'connected' | 'unconfigured';
  description: string;
  requires: string[];
}
