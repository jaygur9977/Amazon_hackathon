import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Sparkles, Cpu, Search, X, Loader2, Play } from 'lucide-react';
import { api } from '../../services/api';

interface TopBarProps {
  title?: string;
  subtitle?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ title, subtitle }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Global search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsDropdownOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      setIsSearching(true);
      api.searchVideos(searchQuery.trim(), 5)
        .then((res) => {
          setSearchResults(res.results || []);
          setIsDropdownOpen(true);
        })
        .catch(() => setSearchResults([]))
        .finally(() => setIsSearching(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const getPageInfo = () => {
    switch (location.pathname) {
      case '/':
        return { 
          title: 'Platform Overview', 
          subtitle: 'AI doorbell & home security video intelligence platform' 
        };
      case '/feed':
        return {
          title: 'Doorbell Camera Feed',
          subtitle: 'Simulated live security feed with real-time bounding boxes and event markers'
        };
      case '/videos':
        return { 
          title: 'Video Library', 
          subtitle: 'Browse 41 doorbell clips, inspect evidence frames, and batch analyze' 
        };
      case '/summary':
        return {
          title: 'Daily Summary',
          subtitle: 'Plain-English security digest with prioritized high-risk alerts and package tracking'
        };
      case '/dashboard':
        return { 
          title: 'Event Analytics', 
          subtitle: 'Real-time telemetry, risk assessments, and temporal event distribution' 
        };
      case '/assistant':
        return { 
          title: 'AI Video Assistant', 
          subtitle: 'Grounded question answering powered by RAG and multi-frame evidence' 
        };
      default:
        return {
          title: title || 'Intelligence Hub',
          subtitle: subtitle || 'Home security video analysis'
        };
    }
  };

  const info = getPageInfo();

  return (
    <header className="h-20 bg-surface/95 backdrop-blur-md border-b border-border sticky top-0 z-20 px-8 flex items-center justify-between shadow-subtle gap-4">
      <div>
        <h2 className="text-xl font-extrabold text-primary tracking-tight">{info.title}</h2>
        <p className="text-xs text-secondary font-medium mt-0.5">{info.subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Global Search Bar */}
        <div ref={searchRef} className="relative w-64 md:w-80">
          <div className="relative flex items-center">
            <Search size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search theft, delivery, visitor, car..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setIsDropdownOpen(true)}
              className="w-full pl-9 pr-8 py-2 bg-slate-100/90 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
            {isSearching ? (
              <Loader2 size={14} className="absolute right-3 animate-spin text-slate-400" />
            ) : searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setIsDropdownOpen(false);
                }}
                className="absolute right-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>

          {/* Search Dropdown Results */}
          {isDropdownOpen && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                Matched Video Evidence ({searchResults.length})
              </div>
              {searchResults.map((r) => (
                <div
                  key={r.id || r.clip_id}
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setSearchQuery('');
                    navigate(`/analysis/${r.clip_id || r.id}`);
                  }}
                  className="p-3 hover:bg-emerald-50/50 cursor-pointer transition flex items-start gap-2.5"
                >
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                    <Play size={12} fill="currentColor" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {r.category || r.file_name}
                      </p>
                      <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                        r.risk === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {r.risk}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {r.snippet || r.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Neural AI Core Badge */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-900 shadow-subtle shrink-0">
          <Cpu className="w-3.5 h-3.5 text-blue-700" />
          <span className="text-[11px] font-bold text-slate-700">Vision Core:</span>
          <span className="font-mono text-[11px] font-bold text-blue-900">Neural Engine</span>
        </div>

        {/* Quick Action Button */}
        <Link
          to="/feed"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm hover:scale-105 shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Camera Feed</span>
        </Link>
      </div>
    </header>
  );
};
