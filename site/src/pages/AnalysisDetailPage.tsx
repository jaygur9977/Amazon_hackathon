import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  ShieldCheck, 
  AlertTriangle, 
  Sparkles, 
  Clock, 
  Tag, 
  RotateCw, 
  FileCheck, 
  Image as ImageIcon,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { VideoClip } from '../types';
import { AnalyzeModal } from '../components/videos/AnalyzeModal';

export const AnalysisDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<VideoClip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Analysis modal state
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Selected evidence frame for preview
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

  if (loading) {
    return (
      <div className="p-16 text-center text-base text-slate-600 animate-pulse space-y-4">
        <RotateCw className="w-10 h-10 animate-spin mx-auto text-emerald-600" />
        <p className="font-semibold">Loading analysis and extracted evidence frames...</p>
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

  const hasAnalysis = Boolean(video.analysis);
  const currentRecord = video.analysis || video.ground_truth;
  const isHighRisk = currentRecord?.risk === 'high';

  return (
    <div className="space-y-10 pb-16">
      {/* Top navigation row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/videos"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-950 transition-colors bg-white px-4 py-2.5 rounded-2xl border-2 border-slate-200 shadow-subtle hover:border-slate-300"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          <span>Back to Library</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRetryAnalysis}
            disabled={isRetrying}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all shadow-subtle hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-amber-300 stroke-[2.5]" />
            <span>{hasAnalysis ? 'Re-run AI Analysis' : 'Analyze Now'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Video Player + Primary Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Video Player & Evidence Strip (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Video Player */}
          <div className="rounded-3xl bg-black border-2 border-slate-200 overflow-hidden shadow-premium aspect-video relative group">
            <video
              src={video.video_url}
              controls
              playsInline
              className="w-full h-full object-contain"
            />
          </div>

          {/* Evidence Frames Gallery */}
          <div className="p-6 rounded-3xl bg-white border-2 border-slate-200 shadow-subtle space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <ImageIcon className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">
                  Extracted Evidence Frames ({video.evidence_frames.length})
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-500 font-mono">Sampled @ 1 frame / 2s</span>
            </div>

            {video.evidence_frames.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3.5">
                {video.evidence_frames.map((frameUrl, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedFrame(frameUrl)}
                    className={`aspect-video rounded-2xl overflow-hidden border-2 cursor-pointer transition-all ${
                      selectedFrame === frameUrl
                        ? 'ring-4 ring-emerald-500/40 border-emerald-500 scale-105 shadow-md'
                        : 'border-slate-200 hover:border-emerald-400'
                    }`}
                  >
                    <img
                      src={frameUrl}
                      alt={`Frame ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-center text-sm font-semibold text-slate-500">
                No evidence frames extracted yet. Click "Analyze Now" to run the computer vision pipeline.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Telemetry, AI Classification & Truth Comparison (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* AI Assessment Card */}
          <div className="p-7 rounded-3xl bg-white border-2 border-slate-200 shadow-premium space-y-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                  {hasAnalysis ? 'AI Model Prediction' : 'Ground-Truth Reference'}
                </span>
                <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight mt-3">
                  {video.file_name}
                </h2>
              </div>

              {/* Risk Badge */}
              <div
                className={`px-3.5 py-1.5 rounded-2xl text-xs font-extrabold border-2 flex items-center gap-2 shadow-sm shrink-0 ${
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

            {/* Event Classification Tag */}
            <div className="p-4 rounded-2xl bg-slate-50 border-2 border-slate-200 space-y-1.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Event Classification
              </span>
              <div className="text-base font-extrabold text-slate-950 capitalize flex items-center gap-2">
                <Tag className="w-5 h-5 text-emerald-600" />
                <span>{currentRecord?.event?.replace(/_/g, ' ') || 'Not Classified'}</span>
              </div>
            </div>

            {/* AI Generated Description */}
            <div className="space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Event Description
              </span>
              <p className="text-sm font-medium text-slate-900 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200">
                "{currentRecord?.description || 'No description available for this clip.'}"
              </p>
            </div>

            {/* Detected Objects */}
            {currentRecord?.objects && currentRecord.objects.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Detected Objects
                </span>
                <div className="flex flex-wrap gap-2">
                  {currentRecord.objects.map((obj, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-xl bg-slate-100 border border-slate-300 text-xs font-bold text-slate-800"
                    >
                      {obj}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Model & Provenance Metadata */}
            <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-sm font-medium">
              <div>
                <span className="text-slate-500 text-xs">Engine Source:</span>
                <p className="font-bold text-slate-900 font-mono text-xs mt-0.5">
                  {video.analysis?.source || 'cv-pipeline'}
                </p>
              </div>
              <div>
                <span className="text-slate-500 text-xs">Pipeline Version:</span>
                <p className="font-bold text-slate-900 font-mono text-xs mt-0.5">v1.2.0 (CV+Vision)</p>
              </div>
            </div>
          </div>

          {/* Ground-Truth vs AI Prediction Comparison Card */}
          {video.ground_truth && (
            <div className="p-6 rounded-3xl bg-white border-2 border-slate-200 shadow-subtle space-y-3">
              <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                <FileCheck className="w-4 h-4 text-emerald-700 stroke-[2.5]" />
                <span>Ground-Truth Verification</span>
              </div>

              <div className="space-y-2 text-sm font-medium">
                <div className="flex justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-600">Truth Event:</span>
                  <span className="font-bold text-slate-900">{video.ground_truth.event.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-600">Truth Risk Rating:</span>
                  <span className="font-bold text-slate-900 capitalize">{video.ground_truth.risk}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-600">Truth Unusual:</span>
                  <span className="font-bold text-slate-900">{video.ground_truth.unusual ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Assessment Disclaimer Notice */}
          <div className="p-5 rounded-2xl bg-slate-50 border-2 border-slate-200 text-xs text-slate-600 leading-relaxed font-medium">
            <span className="font-bold text-slate-900 block mb-1">Assessment Notice:</span>
            A high-risk classification represents an automated assessment by computer vision heuristics and vision models. It does not constitute verified proof that a crime took place.
          </div>
        </div>
      </div>

      {/* Analysis Modal */}
      <AnalyzeModal
        jobId={activeJobId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCompleted={fetchVideoDetails}
      />
    </div>
  );
};
