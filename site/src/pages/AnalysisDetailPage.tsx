import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  ShieldCheck, 
  AlertTriangle, 
  Sparkles, 
  Clock, 
  Tag, 
  RotateCw, 
  Image as ImageIcon,
  AlertCircle,
  Layers,
  Play,
  CheckCircle,
  HelpCircle,
  Eye
} from 'lucide-react';
import { api } from '../services/api';
import { VideoClip, DetectionData } from '../types';
import { AnalyzeModal } from '../components/videos/AnalyzeModal';
import { DetectionOverlay } from '../components/videos/DetectionOverlay';

export const AnalysisDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<VideoClip | null>(null);
  const [detectionData, setDetectionData] = useState<DetectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Video playback & overlay sync
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [showDetections, setShowDetections] = useState(true);

  // Analysis modal state
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Selected evidence frame for preview modal
  const [selectedFrame, setSelectedFrame] = useState<string | null>(null);

  const fetchVideoDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.getVideo(id);
      setVideo(data);
      if (data.evidence_frames?.length) {
        setSelectedFrame(data.evidence_frames[0]);
      }

      // Fetch bounding box detections
      api.getVideoDetections(data.id)
        .then((det) => setDetectionData(det))
        .catch(() => setDetectionData(null));
    } catch (err: any) {
      setError(err.message || 'Failed to load video details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideoDetails();
  }, [id]);

  const handleRetryAnalysis = async () => {
    if (!id) return;
    try {
      setIsRetrying(true);
      const job = await api.retryAnalysis(id);
      setActiveJobId(job.id);
      setIsModalOpen(true);
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    } finally {
      setIsRetrying(false);
    }
  };

  const seekToTime = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-base text-slate-600 animate-pulse space-y-4">
        <RotateCw className="w-10 h-10 animate-spin mx-auto text-emerald-600" />
        <p className="font-semibold">Loading telemetry and bounding box overlays...</p>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="p-10 rounded-3xl bg-rose-50 border-2 border-rose-200 text-center space-y-4 max-w-lg mx-auto">
        <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
        <h3 className="font-bold text-lg text-rose-950">Video Not Found</h3>
        <p className="text-sm text-rose-800 font-medium">{error || 'Requested clip was not found in the repository.'}</p>
        <Link
          to="/videos"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white text-sm font-bold shadow-subtle hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Video Library
        </Link>
      </div>
    );
  }

  const currentRecord = video.analysis || video.ground_truth;
  const isHighRisk = currentRecord?.risk === 'high';
  const timeline = video.analysis?.timeline || [];

  return (
    <div className="space-y-8 pb-16">
      {/* Top Navigation Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/videos"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-slate-950 transition-colors bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          <span>Back to Library</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDetections(!showDetections)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border ${
              showDetections
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <Layers size={15} />
            <span>AI Boxes: {showDetections ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            onClick={handleRetryAnalysis}
            disabled={isRetrying}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-amber-300 stroke-[2.5]" />
            <span>Re-run AI Analysis</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Video Player + Telemetry & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (7 cols): Player + Extracted Frames */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Video Player Container with Detection Overlay */}
          <div className="rounded-2xl bg-black border border-slate-800 overflow-hidden shadow-xl aspect-video relative group">
            {video.video_url ? (
              <>
                <video
                  ref={videoRef}
                  src={video.video_url}
                  controls
                  playsInline
                  onTimeUpdate={() => {
                    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                  }}
                  className="w-full h-full object-contain"
                />
                {showDetections && (
                  <DetectionOverlay
                    detectionData={detectionData}
                    currentTime={currentTime}
                  />
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-900">
                <AlertTriangle size={36} className="text-amber-400 mb-2" />
                <p className="font-bold text-slate-200 text-sm">Long-Footage Benchmark Dataset Entry</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Physical MP4 file is archived. Full AI timeline, person detection bounding boxes, and ground-truth validation records are active below.
                </p>
              </div>
            )}
          </div>

          {/* Evidence Keyframes Strip */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                  Evidence Keyframes ({video.evidence_frames.length})
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-400 font-mono">Iterative Sampling</span>
            </div>

            {video.evidence_frames.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {video.evidence_frames.map((frameUrl, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedFrame(frameUrl)}
                    className={`aspect-video rounded-xl overflow-hidden border cursor-pointer transition ${
                      selectedFrame === frameUrl
                        ? 'ring-2 ring-emerald-500 border-emerald-500 shadow-md'
                        : 'border-slate-200 hover:border-emerald-400'
                    }`}
                  >
                    <img src={frameUrl} alt={`Keyframe ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs font-semibold text-slate-500">
                No keyframes extracted yet. Click "Re-run AI Analysis" to trigger iterative sampling.
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Intelligence Assessment, Timeline & Risk Evidence */}
        <div className="lg:col-span-5 space-y-6">
          {/* Classification & Risk Overview */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                  {video.analysis?.source || 'Verified Analysis Record'}
                </span>
                <h2 className="text-xl font-black text-slate-900 tracking-tight mt-2">
                  {video.analysis?.category || video.file_name}
                </h2>
                <p className="text-xs font-mono text-slate-400 mt-0.5">ID: {video.id} • {video.file_name}</p>
              </div>

              {/* Risk Badge */}
              <div
                className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 shadow-sm shrink-0 ${
                  isHighRisk
                    ? 'bg-rose-100 text-rose-950 border-rose-300'
                    : 'bg-emerald-100 text-emerald-950 border-emerald-300'
                }`}
              >
                {isHighRisk ? (
                  <AlertTriangle className="w-4 h-4 text-rose-600 stroke-[2.5]" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-700 stroke-[2.5]" />
                )}
                <span className="capitalize">{currentRecord?.risk || 'low'} Risk</span>
              </div>
            </div>

            {/* Description */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Event Summary
              </span>
              <p className="text-xs font-medium text-slate-800 leading-relaxed">
                "{currentRecord?.description}"
              </p>
            </div>

            {/* Risk Evidence */}
            {video.analysis?.riskEvidence && (
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                  Risk & Severity Evidence
                </span>
                <p className="text-xs font-semibold text-amber-950 leading-relaxed">
                  {video.analysis.riskEvidence}
                </p>
              </div>
            )}

            {/* Detected Entities */}
            {currentRecord?.objects && currentRecord.objects.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Visible Entities & Objects
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {currentRecord.objects.map((obj, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700"
                    >
                      {obj}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chronological Event Timeline */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                  Timestamped Timeline Segments ({timeline.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-semibold">Click to seek video</span>
            </div>

            {timeline.length > 0 ? (
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {timeline.map((seg, i) => (
                  <div
                    key={i}
                    onClick={() => seekToTime(seg.start_sec)}
                    className="p-3 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 cursor-pointer transition flex items-start gap-3 group"
                  >
                    <span className="px-2 py-0.5 rounded bg-slate-200/80 group-hover:bg-emerald-600 group-hover:text-white text-slate-800 font-mono text-[11px] font-bold shrink-0 transition">
                      {seg.startTime}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 leading-snug">
                        {seg.action}
                      </p>
                      {seg.observations && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {seg.observations}
                        </p>
                      )}
                    </div>
                    <Play size={14} className="text-slate-300 group-hover:text-emerald-600 shrink-0 mt-0.5" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No per-second timeline segments extracted.</p>
            )}
          </div>
        </div>
      </div>

      {/* Analysis Modal */}
      <AnalyzeModal
        isOpen={isModalOpen}
        jobId={activeJobId}
        onClose={() => {
          setIsModalOpen(false);
          fetchVideoDetails();
        }}
        onCompleted={fetchVideoDetails}
      />
    </div>
  );
};
