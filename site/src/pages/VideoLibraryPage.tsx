import React, { useEffect, useState, useMemo } from 'react';
import { VideoClip, AnalysisJob } from '../types';
import { api } from '../services/api';
import { VideoCard } from '../components/videos/VideoCard';
import { VideoFilterBar } from '../components/videos/VideoFilterBar';
import { AnalyzeModal } from '../components/videos/AnalyzeModal';
import { Film, AlertCircle, RefreshCw } from 'lucide-react';

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
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = video.file_name.toLowerCase().includes(q);
          const matchBucket = video.bucket.toLowerCase().includes(q);
          const matchEvent =
            video.analysis?.event?.toLowerCase().includes(q) ||
            video.ground_truth?.event?.toLowerCase().includes(q);
          if (!matchName && !matchBucket && !matchEvent) return false;
        }

        // Status filter
        if (statusFilter !== 'all') {
          if (video.status !== statusFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.file_name.localeCompare(b.file_name);
        }
        if (sortBy === 'size') {
          return b.file_size_bytes - a.file_size_bytes;
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

  return (
    <div className="space-y-8">
      {/* Title & Refresh header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">Camera Footage Library</h1>
          <p className="text-base text-slate-600 font-medium mt-1">
            Select one or multiple video clips to invoke the computer vision pipeline with automated evidence frame extraction.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchVideos}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border-2 border-slate-200 text-sm font-bold text-slate-700 hover:text-slate-950 hover:bg-slate-50 transition-colors shadow-subtle hover:border-slate-300"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Library</span>
        </button>
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
              className="h-[360px] rounded-2xl bg-surface border border-border p-4 animate-pulse space-y-4"
            >
              <div className="aspect-video bg-slate-100 rounded-xl" />
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-soft-pink/30 border border-red-200 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
          <h3 className="font-bold text-sm text-red-950">Unable to load video clips</h3>
          <p className="text-xs text-red-800">{error}</p>
          <button
            type="button"
            onClick={fetchVideos}
            className="px-4 py-2 rounded-xl bg-red-900 text-white text-xs font-semibold"
          >
            Try Again
          </button>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="p-12 rounded-2xl bg-surface border border-border text-center space-y-3">
          <Film className="w-10 h-10 text-secondary mx-auto opacity-40" />
          <h3 className="font-bold text-sm text-primary">No video clips match your filter</h3>
          <p className="text-xs text-secondary max-w-sm mx-auto">
            Try adjusting your search query or reset the filter status to view all clips.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
            }}
            className="px-4 py-2 rounded-xl bg-background border border-border text-xs font-semibold text-primary"
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
    </div>
  );
};
