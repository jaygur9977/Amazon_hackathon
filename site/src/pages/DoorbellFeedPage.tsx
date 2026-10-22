import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  SkipForward, 
  SkipBack, 
  AlertTriangle, 
  CheckCircle, 
  ShieldAlert, 
  Layers, 
  Bell, 
  Clock, 
  Eye, 
  ChevronRight, 
  Radio 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, setStoredBackendUrl } from '../services/api';
import { VideoClip, DetectionData } from '../types';
import { DetectionOverlay } from '../components/videos/DetectionOverlay';

export const DoorbellFeedPage: React.FC = () => {
  const [videos, setVideos] = useState<VideoClip[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoClip | null>(null);
  const [detectionData, setDetectionData] = useState<DetectionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quickTunnelUrl, setQuickTunnelUrl] = useState('');

  // Playback state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showDetections, setShowDetections] = useState(true);

  // Active event notification banner
  const [activeAlert, setActiveAlert] = useState<{
    title: string;
    description: string;
    risk: 'low' | 'high';
    timeFormatted: string;
  } | null>(null);

  useEffect(() => {
    api.getVideos()
      .then((res) => {
        setVideos(res.videos);
        // Default to first playable video
        const playable = res.videos.find((v) => v.has_media_file);
        if (playable) setSelectedVideo(playable);
      })
      .catch((err) => console.error('Failed to load videos:', err))
      .finally(() => setIsLoading(false));
  }, []);

  // When selected video changes, load its detection bounding boxes
  useEffect(() => {
    if (!selectedVideo) return;
    setCurrentTime(0);
    setActiveAlert(null);
    setIsPlaying(false);

    api.getVideoDetections(selectedVideo.id)
      .then((data) => setDetectionData(data))
      .catch(() => setDetectionData(null));
  }, [selectedVideo]);

  // Video time update listener
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);

    // Check if playback hits an event marker
    if (selectedVideo?.analysis?.timeline) {
      const activeSeg = selectedVideo.analysis.timeline.find(
        (seg) => seg.start_sec <= t && t <= seg.end_sec
      );
      if (activeSeg && activeSeg.action !== 'Quiet background') {
        setActiveAlert({
          title: selectedVideo.analysis.category || selectedVideo.analysis.event.replace(/_/g, ' '),
          description: activeSeg.action,
          risk: selectedVideo.analysis.risk,
          timeFormatted: activeSeg.startTime
        });
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration || selectedVideo?.duration_sec || 15);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Switch to next or previous event clip
  const navigateClip = (direction: 'prev' | 'next') => {
    const playable = videos.filter((v) => v.has_media_file);
    if (!playable.length || !selectedVideo) return;
    const idx = playable.findIndex((v) => v.id === selectedVideo.id);
    let targetIdx = direction === 'next' ? idx + 1 : idx - 1;
    if (targetIdx < 0) targetIdx = playable.length - 1;
    if (targetIdx >= playable.length) targetIdx = 0;
    setSelectedVideo(playable[targetIdx]);
  };

  return (
    <div className="space-y-6">
      {/* Feed Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Front Door Security Camera Feed
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
            <Radio size={14} className="text-rose-500 animate-pulse" />
            <span className="text-rose-700 font-bold uppercase tracking-wider">Demo / Simulated Security Replay</span>
            <span>• High-definition real-time surveillance analyzer</span>
          </p>
        </div>

        {/* Quick event jump & controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDetections(!showDetections)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition border ${
              showDetections
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <Layers size={14} />
            <span>AI Bounding Boxes: {showDetections ? 'ON' : 'OFF'}</span>
          </button>

          {selectedVideo && (
            <Link
              to={`/analysis/${selectedVideo.id}`}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-sm"
            >
              <span>Full Analysis</span>
              <ChevronRight size={14} />
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Camera Video Player Container */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative bg-slate-950 rounded-2xl overflow-hidden shadow-xl aspect-video flex items-center justify-center border border-slate-800 group">
            {selectedVideo?.video_url ? (
              <>
                <video
                  ref={videoRef}
                  src={selectedVideo.video_url}
                  className="w-full h-full object-contain"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => setIsPlaying(false)}
                  onClick={togglePlay}
                  playsInline
                />

                {/* On-Demand Bounding Box Overlay */}
                {showDetections && (
                  <DetectionOverlay
                    detectionData={detectionData}
                    currentTime={currentTime}
                  />
                )}

                {/* Simulated Camera Feed Overlay HUD */}
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                  <span className="bg-red-600/90 text-white text-[10px] font-black tracking-widest px-2 py-0.5 rounded shadow">
                    REC
                  </span>
                  <span className="bg-slate-900/80 backdrop-blur-sm text-slate-200 font-mono text-xs px-2.5 py-0.5 rounded border border-slate-700/50">
                    CAM-01 • FRONT DOOR
                  </span>
                  <span className="bg-slate-900/80 backdrop-blur-sm text-emerald-400 font-mono text-xs px-2 py-0.5 rounded border border-slate-700/50">
                    {formatTime(currentTime)}
                  </span>
                </div>

                {/* Animated Ring-Style Event Notification Banner */}
                {activeAlert && (
                  <div className="absolute top-4 right-4 z-20 max-w-sm animate-in slide-in-from-top-3 fade-in duration-200">
                    <div className={`p-3 rounded-xl shadow-lg border backdrop-blur-md flex items-start gap-3 ${
                      activeAlert.risk === 'high'
                        ? 'bg-rose-950/85 border-rose-500/80 text-rose-100'
                        : 'bg-emerald-950/85 border-emerald-500/80 text-emerald-100'
                    }`}>
                      <Bell size={18} className={activeAlert.risk === 'high' ? 'text-rose-400 animate-bounce' : 'text-emerald-400'} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black uppercase tracking-wider">{activeAlert.title}</p>
                          <span className="text-[10px] font-mono opacity-80">{activeAlert.timeFormatted}</span>
                        </div>
                        <p className="text-[11px] mt-0.5 leading-snug font-medium opacity-90">{activeAlert.description}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : videos.length === 0 ? (
              <div className="p-8 text-center text-slate-300 space-y-3 max-w-md mx-auto">
                <AlertTriangle size={36} className="mx-auto text-amber-400 animate-pulse" />
                <p className="text-sm font-bold text-white">Backend Connection Required for Camera Stream</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The camera feed requires your local backend. Run <code className="bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">cloudflared tunnel --url http://localhost:5000</code> and paste the URL:
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={quickTunnelUrl}
                    onChange={(e) => setQuickTunnelUrl(e.target.value)}
                    placeholder="https://xxxx.trycloudflare.com"
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                  />
                  <button
                    onClick={() => {
                      if (!quickTunnelUrl.trim()) return;
                      setStoredBackendUrl(quickTunnelUrl.trim());
                      window.location.reload();
                    }}
                    disabled={!quickTunnelUrl.trim()}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition disabled:opacity-50"
                  >
                    Connect
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">
                <AlertTriangle size={32} className="mx-auto mb-2 text-amber-500" />
                <p className="text-sm font-bold text-slate-200">Video Media Stream Unavailable</p>
                <p className="text-xs text-slate-500 mt-1">This is a dataset benchmark entry. Select another clip from the sidebar.</p>
              </div>
            )}
          </div>

          {/* Interactive Player Controls & Timeline Markers */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            {/* Timeline Scrubbing Bar with Real Event Markers */}
            <div className="relative pt-1">
              <input
                type="range"
                min={0}
                max={duration || 15}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none"
              />

              {/* Event Marker Pins on Timeline */}
              {selectedVideo?.analysis?.timeline && duration > 0 && (
                <div className="relative w-full h-2 pointer-events-none -mt-2">
                  {selectedVideo.analysis.timeline.map((seg, i) => {
                    if (seg.action === 'Quiet background') return null;
                    const leftPct = (seg.start_sec / duration) * 100;
                    return (
                      <div
                        key={i}
                        className={`absolute top-0 w-2 h-2 rounded-full -translate-x-1/2 ${
                          selectedVideo.analysis?.risk === 'high' ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                        style={{ left: `${Math.min(100, Math.max(0, leftPct))}%` }}
                        title={`${seg.startTime} - ${seg.action}`}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigateClip('prev')}
                  title="Previous Clip"
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                >
                  <SkipBack size={18} />
                </button>

                <button
                  onClick={togglePlay}
                  className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition"
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
                </button>

                <button
                  onClick={() => navigateClip('next')}
                  title="Next Clip"
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                >
                  <SkipForward size={18} />
                </button>

                <button
                  onClick={toggleMute}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>

                <span className="text-xs font-mono text-slate-600 font-semibold">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  selectedVideo?.analysis?.risk === 'high'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}>
                  Risk: {selectedVideo?.analysis?.risk || 'Normal'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Active Camera Event List */}
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Eye size={16} className="text-emerald-600" />
              <span>Camera Clips ({videos.filter(v => v.has_media_file).length})</span>
            </h3>

            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {videos.filter(v => v.has_media_file).map((clip) => {
                const isSelected = selectedVideo?.id === clip.id;
                const isHighRisk = clip.analysis?.risk === 'high';

                return (
                  <button
                    key={clip.id}
                    onClick={() => setSelectedVideo(clip)}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-start gap-3 ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-16 h-12 bg-slate-200 rounded-lg overflow-hidden shrink-0 relative">
                      {clip.thumbnail_url ? (
                        <img src={clip.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-[10px]">
                          CLIP
                        </div>
                      )}
                      {isHighRisk && (
                        <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-rose-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {clip.analysis?.category || clip.file_name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {clip.analysis?.description || 'Ready for playback'}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                        <span className="font-mono">{clip.duration_sec}s</span>
                        <span>•</span>
                        <span className={isHighRisk ? 'text-rose-600 font-bold' : 'text-emerald-700 font-semibold'}>
                          {clip.analysis?.risk === 'high' ? 'High Risk' : 'Low Risk'}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
