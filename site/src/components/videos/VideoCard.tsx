import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Check, 
  RotateCw, 
  AlertTriangle, 
  ShieldCheck, 
  HardDrive, 
  Eye, 
  Tag, 
  Sparkles,
  Trash2
} from 'lucide-react';
import { VideoClip } from '../../types';

interface VideoCardProps {
  video: VideoClip;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onAnalyzeSingle: (id: string) => void;
  onDeleteVideo?: (id: string) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  isSelected,
  onToggleSelect,
  onAnalyzeSingle,
  onDeleteVideo
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return mins > 0 ? `${mins}m ${s}s` : `${s}s`;
  };

  const getStatusBadge = () => {
    if (video.status === 'processing') {
      return (
        <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-950 border border-amber-300 shadow-sm">
          <RotateCw className="w-3.5 h-3.5 animate-spin text-amber-700" /> Processing
        </span>
      );
    }
    if (video.status === 'completed') {
      return (
        <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> Analyzed
        </span>
      );
    }
    if (video.status === 'failed') {
      return (
        <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-950 border border-rose-300 shadow-sm">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Failed
        </span>
      );
    }
    return (
      <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/95 text-slate-700 border border-slate-300 shadow-sm">
        Ready
      </span>
    );
  };

  const activeEvent = video.analysis?.event || video.ground_truth?.event;
  const activeRisk = video.analysis?.risk || video.ground_truth?.risk;

  return (
    <div className="perspective-1000 w-full h-[390px] select-none">
      <motion.div
        className="relative w-full h-full transform-style-3d cursor-pointer"
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* ===================== FRONT SIDE ===================== */}
        <div
          className={`absolute inset-0 backface-hidden rounded-3xl bg-white border-2 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-subtle hover:shadow-premium ${
            isSelected
              ? 'border-emerald-500 bg-emerald-50/30 ring-4 ring-emerald-400/30 scale-[1.02]'
              : 'border-slate-200 hover:border-slate-400'
          }`}
          onClick={() => setIsFlipped(true)}
        >
          {/* Top thumbnail & badge area */}
          <div className="relative aspect-video w-full bg-slate-900 overflow-hidden group">
            {video.thumbnail_url ? (
              <img
                src={video.thumbnail_url}
                alt={video.file_name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <video
                src={video.video_url}
                className="w-full h-full object-cover opacity-80"
                preload="metadata"
                muted
              />
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40 pointer-events-none" />

            {/* Selection Checkbox */}
            <div
              className="absolute top-3.5 left-3.5 z-10"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(video.id);
              }}
            >
              <button
                type="button"
                aria-label={`Select ${video.file_name}`}
                className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-md scale-110 ring-2 ring-white'
                    : 'bg-white/90 backdrop-blur-md text-transparent border-2 border-slate-300 hover:border-emerald-600 hover:scale-105'
                }`}
              >
                <Check className={`w-4 h-4 stroke-[3] ${isSelected ? 'text-white' : 'opacity-0'}`} />
              </button>
            </div>

            {/* Status Badge */}
            <div className="absolute top-3.5 right-3.5 z-10">
              {getStatusBadge()}
            </div>

            {/* Duration pill */}
            <div className="absolute bottom-3 right-3 z-10 px-2.5 py-0.5 rounded-lg bg-black/75 backdrop-blur-sm text-xs font-mono font-bold text-white shadow">
              {formatDuration(video.duration_sec)}
            </div>
          </div>

          {/* Card Body */}
          <div className="p-5 flex-1 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-950 tracking-tight truncate" title={video.file_name}>
                {video.file_name}
              </h3>
              <p className="text-xs font-semibold text-slate-500 capitalize mt-0.5">
                Category: {video.bucket.replace(/[-_]/g, ' ')}
              </p>
            </div>

            {/* Summary tags */}
            <div className="my-2.5 flex flex-wrap gap-2">
              {activeEvent && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-800">
                  <Tag className="w-3.5 h-3.5 text-slate-500" />
                  {activeEvent.replace(/_/g, ' ')}
                </span>
              )}
              {activeRisk === 'high' && (
                <span className="text-xs font-extrabold px-3 py-1 rounded-xl bg-rose-100 text-rose-950 border border-rose-300">
                  High Risk
                </span>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <HardDrive className="w-4 h-4 text-slate-400" />
                {formatFileSize(video.file_size_bytes)}
              </span>

              <div className="flex items-center gap-1.5">
                {onDeleteVideo && (video.bucket === 'uploaded' || video.bucket === 'uploads') && (
                  <button
                    type="button"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete uploaded footage "${video.file_name}"?`)) {
                        onDeleteVideo(video.id);
                      }
                    }}
                    title="Delete uploaded video"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlipped(true);
                  }}
                >
                  <span>Details</span>
                  <RotateCw className="w-3 h-3 text-emerald-600" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ===================== BACK SIDE ===================== */}
        <div
          className="absolute inset-0 backface-hidden rotate-y-180 rounded-3xl bg-white border-2 border-slate-300 shadow-premium p-6 flex flex-col justify-between overflow-hidden"
          onClick={() => setIsFlipped(false)}
        >
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-sm font-extrabold text-slate-950 truncate max-w-[200px]" title={video.file_name}>
                {video.file_name}
              </span>
              <button
                type="button"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(false);
                }}
                title="Flip back"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>

            {/* Metadata list */}
            <div className="space-y-1.5 text-xs font-medium">
              <div className="flex justify-between text-slate-600">
                <span>File Size:</span>
                <span className="font-bold text-slate-900">{formatFileSize(video.file_size_bytes)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Duration:</span>
                <span className="font-bold text-slate-900">{formatDuration(video.duration_sec)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>State:</span>
                <span className="capitalize font-bold text-slate-900">{video.status.replace('_', ' ')}</span>
              </div>
              {activeRisk && (
                <div className="flex justify-between text-slate-600">
                  <span>Assessed Risk:</span>
                  <span className={`font-bold capitalize ${activeRisk === 'high' ? 'text-red-700' : 'text-emerald-700'}`}>
                    {activeRisk}
                  </span>
                </div>
              )}
            </div>

            {/* Detected description or ground truth */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                {video.analysis ? 'AI Output' : 'Ground-Truth Summary'}
              </p>
              <p className="text-slate-900 text-xs font-medium line-clamp-3 leading-relaxed">
                {video.analysis?.description || video.ground_truth?.description || 'No summary generated yet. Click analyze to inspect frames.'}
              </p>
            </div>
          </div>

          {/* Action buttons on back */}
          <div className="pt-3 border-t border-slate-200 flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
            <Link
              to={`/analysis/${encodeURIComponent(video.id)}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-subtle"
            >
              <Eye className="w-4 h-4" />
              <span>Full Analysis</span>
            </Link>

            <button
              type="button"
              className="flex items-center justify-center p-3 rounded-2xl bg-emerald-100 text-emerald-950 border-2 border-emerald-300 hover:bg-emerald-200 transition-colors shadow-subtle"
              onClick={() => onAnalyzeSingle(video.id)}
              title="Analyze this clip now"
            >
              <Sparkles className="w-4 h-4 text-emerald-800 stroke-[2.5]" />
            </button>

            {onDeleteVideo && (video.bucket === 'uploaded' || video.bucket === 'uploads') && (
              <button
                type="button"
                className="flex items-center justify-center p-3 rounded-2xl bg-rose-50 text-rose-700 border-2 border-rose-200 hover:bg-rose-100 transition-colors shadow-subtle"
                onClick={() => {
                  if (window.confirm(`Delete uploaded footage "${video.file_name}"?`)) {
                    onDeleteVideo(video.id);
                  }
                }}
                title="Delete uploaded video"
              >
                <Trash2 className="w-4 h-4 text-rose-600 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
