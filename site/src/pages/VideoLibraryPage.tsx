import React, { useEffect, useState, useMemo } from 'react';
import { VideoClip } from '../types';
import { api } from '../services/api';
import { VideoCard } from '../components/videos/VideoCard';
import { VideoFilterBar } from '../components/videos/VideoFilterBar';
import { AnalyzeModal } from '../components/videos/AnalyzeModal';
import { VideoInputModal } from '../components/videos/VideoInputModal';
import { Film, AlertCircle, RefreshCw, Upload, CheckCircle2, ShieldAlert } from 'lucide-react';

export const VideoLibraryPage: React.FC = () => {
  const [videos, setVideos] = useState<VideoClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Selection states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal / Job state
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getVideos();
      setVideos(res.videos || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load videos from backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  // Filtered and Sorted videos
  const filteredVideos = useMemo(() => {
    return videos
      .filter((video) => {
        // Universal search filter across title, category, event, description, searchableText
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = video.file_name.toLowerCase().includes(q);
          const matchId = (video.clip_id || video.id).toLowerCase().includes(q);
          const matchBucket = video.bucket.toLowerCase().includes(q);
          const matchCategory = video.analysis?.category?.toLowerCase().includes(q);
          const matchEvent =
            video.analysis?.event?.toLowerCase().includes(q) ||
            video.ground_truth?.event?.toLowerCase().includes(q);
          const matchDesc = 
            video.analysis?.description?.toLowerCase().includes(q) ||
            video.ground_truth?.description?.toLowerCase().includes(q);
          const matchText = video.analysis?.searchableText?.toLowerCase().includes(q);
          
          // Semantic matching for theft
          const isTheftQuery = q.includes('theft') || q.includes('steal');
          const isTheftClip = video.analysis?.event === 'package_taken_by_stranger' || 
                              video.bucket === 'package-theft';

          if (!matchName && !matchId && !matchBucket && !matchCategory && !matchEvent && !matchDesc && !matchText && !(isTheftQuery && isTheftClip)) {
            return false;
          }
        }

        // Status filter
        if (statusFilter !== 'all') {
          if (statusFilter === 'playable') {
            if (!video.has_media_file) return false;
          } else if (statusFilter === 'benchmark') {
            if (!video.is_dataset_benchmark) return false;
          } else if (video.status !== statusFilter) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.file_name.localeCompare(b.file_name);
        }
        if (sortBy === 'size') {
          return (b.file_size_bytes || 0) - (a.file_size_bytes || 0);
        }
        if (sortBy === 'duration') {
          return b.duration_sec - a.duration_sec;
        }
        if (sortBy === 'status') {
          return a.status.localeCompare(b.status);
        }
        return 0;
      });
  }, [videos, searchQuery, statusFilter, sortBy]);

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllEligible = () => {
    const eligibleIds = filteredVideos.map((v) => v.id);
    setSelectedIds(new Set(eligibleIds));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Start analysis for selected
  const handleAnalyzeSelected = async () => {
    if (selectedIds.size === 0) return;
    try {
      setIsAnalyzing(true);
      const job = await api.startAnalysis(Array.from(selectedIds));
      setActiveJobId(job.id);
      setIsModalOpen(true);
    } catch (err: any) {
      alert(`Failed to start analysis: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Start analysis for single card
  const handleAnalyzeSingle = async (id: string) => {
    try {
      setIsAnalyzing(true);
      const job = await api.startAnalysis([id]);
      setActiveJobId(job.id);
      setIsModalOpen(true);
    } catch (err: any) {
      alert(`Failed to start analysis: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleJobCompleted = () => {
    fetchVideos();
    clearSelection();
  };

  const handleDeleteVideo = async (id: string) => {
    try {
      await api.deleteVideo(id);
      fetchVideos();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleClearProcessing = async () => {
    try {
      await api.clearProcessingJobs();
      fetchVideos();
    } catch (err: any) {
      alert(`Failed to clear processing state: ${err.message}`);
    }
  };

  const totalClips = videos.length;
  const analyzedClips = videos.filter((v) => v.status === 'completed').length;
  const playableClips = videos.filter((v) => v.has_media_file).length;
  const benchmarkClips = videos.filter((v) => v.is_dataset_benchmark).length;
  const hasProcessingClips = videos.some((v) => v.status === 'processing');

  return (
    <div className="space-y-6">
      {/* Title & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">Camera Footage Library</h1>
          <p className="text-sm text-slate-600 font-medium mt-1">
            Authoritative 41-clip doorbell & security video dataset with completed AI analysis and telemetry.
          </p>

          {/* Dataset Status Badges */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-900 text-white shadow-sm">
              Total Dataset: {totalClips} Clips
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
              <CheckCircle2 size={13} className="text-emerald-700" />
              {analyzedClips} Completed
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
              {playableClips} Streamable Videos
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200">
              {benchmarkClips} Long Benchmark Clips
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasProcessingClips && (
            <button
              type="button"
              onClick={handleClearProcessing}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition shadow-sm animate-pulse"
              title="Clear interrupted / stuck processing queue"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Stuck Processing</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsInputModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-sm"
          >
            <Upload size={15} />
            <span>Add Footage / Ingest</span>
          </button>

          <button
            type="button"
            onClick={fetchVideos}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-slate-950 hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <VideoFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectedCount={selectedIds.size}
        totalEligibleCount={filteredVideos.length}
        onSelectAllEligible={selectAllEligible}
        onClearSelection={clearSelection}
        onAnalyzeSelected={handleAnalyzeSelected}
        isAnalyzing={isAnalyzing}
      />

      {/* Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="h-[340px] rounded-2xl bg-white border border-slate-200 p-4 animate-pulse space-y-4 shadow-sm"
            >
              <div className="aspect-video bg-slate-100 rounded-xl" />
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="font-bold text-sm text-rose-950">Unable to load video clips</h3>
          <p className="text-xs text-rose-800">{error}</p>
          <button
            type="button"
            onClick={fetchVideos}
            className="px-4 py-2 rounded-xl bg-rose-900 text-white text-xs font-semibold"
          >
            Try Again
          </button>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-sm">
          <Film className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="font-bold text-sm text-slate-900">No video clips match your filter</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search query or reset the filter status to view all 41 clips.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
            className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5'
              : 'space-y-3'
          }
        >
          {filteredVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              isSelected={selectedIds.has(video.id)}
              onToggleSelect={toggleSelect}
              onAnalyzeSingle={handleAnalyzeSingle}
              onDeleteVideo={handleDeleteVideo}
            />
          ))}
        </div>
      )}

      {/* Analysis Progress Modal */}
      <AnalyzeModal
        jobId={activeJobId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCompleted={handleJobCompleted}
      />

      {/* Video Input Modal */}
      <VideoInputModal
        isOpen={isInputModalOpen}
        onClose={() => setIsInputModalOpen(false)}
        onVideoAdded={fetchVideos}
      />
    </div>
  );
};
