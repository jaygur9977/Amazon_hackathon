import React from 'react';
import { 
  Search, 
  Grid3X3, 
  List, 
  Sparkles, 
  CheckSquare, 
  ArrowUpDown
} from 'lucide-react';

interface VideoFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  sortBy: string;
  onSortByChange: (sort: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  selectedCount: number;
  totalEligibleCount: number;
  onSelectAllEligible: () => void;
  onClearSelection: () => void;
  onAnalyzeSelected: () => void;
  isAnalyzing: boolean;
}

export const VideoFilterBar: React.FC<VideoFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  viewMode,
  onViewModeChange,
  selectedCount,
  totalEligibleCount,
  onSelectAllEligible,
  onClearSelection,
  onAnalyzeSelected,
  isAnalyzing
}) => {
  const filterTabs = [
    { id: 'all', label: 'All Footage' },
    { id: 'not_analyzed', label: 'Not Analyzed' },
    { id: 'processing', label: 'Processing' },
    { id: 'completed', label: 'Completed' },
    { id: 'failed', label: 'Failed' },
  ];

  return (
    <div className="space-y-4 mb-8">
      {/* Top search & controls row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative flex-1 min-w-[320px]">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search footage by filename, incident category, or keyword..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border-2 border-slate-200 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-subtle"
          />
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value)}
              className="appearance-none pl-10 pr-9 py-3 rounded-2xl bg-white border-2 border-slate-200 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-subtle cursor-pointer hover:border-slate-300"
            >
              <option value="name">Sort: Filename</option>
              <option value="size">Sort: File Size</option>
              <option value="duration">Sort: Duration</option>
              <option value="status">Sort: Status</option>
            </select>
            <ArrowUpDown className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Grid / List toggle */}
          <div className="flex items-center rounded-2xl bg-white border-2 border-slate-200 p-1 shadow-subtle">
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={`p-2 rounded-xl transition-all ${
                viewMode === 'grid' ? 'bg-emerald-100 text-emerald-950 shadow-sm' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="Grid view"
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              className={`p-2 rounded-xl transition-all ${
                viewMode === 'list' ? 'bg-emerald-100 text-emerald-950 shadow-sm' : 'text-slate-400 hover:text-slate-700'
              }`}
              title="List view"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Selection Actions Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        {/* Status tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onStatusFilterChange(tab.id)}
              className={`px-4 py-2 rounded-2xl text-sm font-bold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-subtle scale-105'
                  : 'bg-white text-slate-700 hover:text-slate-950 border-2 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Selection actions & CTA */}
        <div className="flex items-center gap-3">
          {selectedCount > 0 ? (
            <>
              <button
                type="button"
                onClick={onClearSelection}
                className="text-sm font-bold text-slate-500 hover:text-slate-900 px-3 py-2 transition-colors"
              >
                Deselect ({selectedCount})
              </button>
              <button
                type="button"
                onClick={onAnalyzeSelected}
                disabled={isAnalyzing}
                className="flex items-center gap-2.5 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-sm font-extrabold hover:shadow-elevated transition-all shadow-premium disabled:opacity-50 hover:scale-105 active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-amber-300 stroke-[2.5]" />
                <span>Analyze Selected ({selectedCount})</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onSelectAllEligible}
              className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-slate-950 bg-white border-2 border-slate-200 px-4 py-2 rounded-2xl hover:bg-slate-50 transition-colors shadow-subtle hover:border-slate-300"
            >
              <CheckSquare className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
              <span>Select All ({totalEligibleCount})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
