import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Sparkles, Cpu, ShieldCheck } from 'lucide-react';

interface TopBarProps {
  title?: string;
  subtitle?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ title, subtitle }) => {
  const location = useLocation();

  const getPageInfo = () => {
    switch (location.pathname) {
      case '/':
        return { 
          title: 'Platform Overview', 
          subtitle: 'AI doorbell & home security video intelligence platform' 
        };
      case '/videos':
        return { 
          title: 'Video Library', 
          subtitle: 'Browse, inspect evidence frames, and batch analyze camera footage' 
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
    <header className="h-20 bg-surface/95 backdrop-blur-md border-b border-border sticky top-0 z-20 px-8 flex items-center justify-between shadow-subtle">
      <div>
        <h2 className="text-xl font-extrabold text-primary tracking-tight">{info.title}</h2>
        <p className="text-sm text-secondary font-medium mt-0.5">{info.subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Neural AI Core Badge (No Groq keyword) */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-900 shadow-subtle">
          <Cpu className="w-4 h-4 text-blue-700" />
          <span className="text-xs font-bold text-slate-700">Vision Core:</span>
          <span className="font-mono text-xs font-bold text-blue-900">Multimodal Neural Engine</span>
        </div>

        {/* Quick Action Button */}
        <Link
          to="/videos"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-slate-800 transition-all shadow-premium hover:scale-105"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>Analyze Footage</span>
        </Link>
      </div>
    </header>
  );
};
