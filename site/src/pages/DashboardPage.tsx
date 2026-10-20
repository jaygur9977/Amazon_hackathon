import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Film, 
  RotateCw, 
  Sparkles, 
  Activity, 
  CheckCircle2, 
  ChevronRight,
  Tag
} from 'lucide-react';
import { api } from '../services/api';
import { DashboardStats } from '../types';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="p-16 text-center text-base text-slate-600 animate-pulse space-y-4">
        <RotateCw className="w-10 h-10 animate-spin mx-auto text-emerald-600" />
        <p className="font-semibold">Loading platform telemetry and analytics...</p>
      </div>
    );
  }

  const eventEntries = Object.entries(stats?.event_distribution || {});
  const totalAnalyzed = stats?.analyzed_videos || 0;

  return (
    <div className="space-y-10 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">Event Intelligence Dashboard</h1>
          <p className="text-base text-slate-600 font-medium mt-1">
            Aggregated metrics derived strictly from persistent model analysis records.
          </p>
        </div>

        <Link
          to="/videos"
          className="self-start sm:self-auto flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all shadow-premium hover:scale-105 active:scale-95"
        >
          <Sparkles className="w-4 h-4 text-amber-300 stroke-[2.5]" />
          <span>Analyze More Clips</span>
        </Link>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Available */}
        <div className="p-6 rounded-3xl bg-white border-2 border-slate-200/90 shadow-subtle space-y-2 hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-600">
            <span className="text-sm font-bold">Total Camera Clips</span>
            <Film className="w-5 h-5 text-slate-400" />
          </div>
          <div className="text-4xl font-extrabold text-slate-950 font-mono">{stats?.total_videos || 0}</div>
          <p className="text-xs text-slate-500 font-medium">In local camera repository</p>
        </div>

        {/* Successfully Analyzed */}
        <div className="p-6 rounded-3xl bg-white border-2 border-slate-200/90 shadow-subtle space-y-2 hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-sm font-bold">Analyzed by AI</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600 stroke-[2.5]" />
          </div>
          <div className="text-4xl font-extrabold text-emerald-700 font-mono">{stats?.analyzed_videos || 0}</div>
          <p className="text-xs text-slate-500 font-medium">
            {stats?.not_analyzed_videos || 0} clip(s) ready for analysis
          </p>
        </div>

        {/* High Risk Flags */}
        <div className="p-6 rounded-3xl bg-white border-2 border-slate-200/90 shadow-subtle space-y-2 hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between text-rose-800">
            <span className="text-sm font-bold">High-Risk Events</span>
            <AlertTriangle className="w-5 h-5 text-rose-600 stroke-[2.5]" />
          </div>
          <div className="text-4xl font-extrabold text-rose-600 font-mono">{stats?.high_risk_count || 0}</div>
          <p className="text-xs text-slate-500 font-medium">Tampering, unauthorized entries</p>
        </div>

        {/* Unusual Incidents */}
        <div className="p-6 rounded-3xl bg-white border-2 border-slate-200/90 shadow-subtle space-y-2 hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between text-purple-800">
            <span className="text-sm font-bold">Unusual Incidents</span>
            <Activity className="w-5 h-5 text-purple-600 stroke-[2.5]" />
          </div>
          <div className="text-4xl font-extrabold text-purple-700 font-mono">{stats?.unusual_activity_count || 0}</div>
          <p className="text-xs text-slate-500 font-medium">Lingering, nocturnal movement</p>
        </div>
      </div>

      {/* Analytics Charts & Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Event Distribution Breakdown (7 cols) */}
        <div className="lg:col-span-7 p-8 rounded-3xl bg-white border-2 border-slate-200 shadow-subtle space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h2 className="text-xl font-extrabold text-slate-950 tracking-tight">Event Type Distribution</h2>
            <span className="text-sm font-bold text-slate-500 font-mono">
              {totalAnalyzed} Analyzed Total
            </span>
          </div>

          {eventEntries.length > 0 ? (
            <div className="space-y-5">
              {eventEntries.map(([eventName, count]) => {
                const pct = Math.round((count / totalAnalyzed) * 100);
                return (
                  <div key={eventName} className="space-y-2">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="capitalize text-slate-900 flex items-center gap-2">
                        <Tag className="w-4 h-4 text-emerald-600" />
                        {eventName.replace(/_/g, ' ')}
                      </span>
                      <span className="font-mono text-slate-600">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-10 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-center text-sm font-semibold text-slate-500">
              No event classifications generated yet. Run video analysis in the library to populate telemetry.
            </div>
          )}
        </div>

        {/* Risk Distribution Breakdown (5 cols) */}
        <div className="lg:col-span-5 p-8 rounded-3xl bg-white border-2 border-slate-200 shadow-subtle space-y-6">
          <h2 className="text-xl font-extrabold text-slate-950 tracking-tight pb-3 border-b border-slate-200">
            Risk Assessment Split
          </h2>

          <div className="grid grid-cols-2 gap-5">
            <div className="p-6 rounded-2xl bg-emerald-50 border-2 border-emerald-200 text-center space-y-1.5">
              <ShieldCheck className="w-7 h-7 text-emerald-700 mx-auto stroke-[2.5]" />
              <div className="text-3xl font-extrabold text-emerald-950 font-mono">
                {stats?.risk_distribution.low || 0}
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">Low Risk</div>
            </div>

            <div className="p-6 rounded-2xl bg-rose-50 border-2 border-rose-200 text-center space-y-1.5">
              <AlertTriangle className="w-7 h-7 text-rose-600 mx-auto stroke-[2.5]" />
              <div className="text-3xl font-extrabold text-rose-950 font-mono">
                {stats?.risk_distribution.high || 0}
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-rose-800">High Risk</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-600 leading-relaxed font-medium">
            <span className="font-extrabold text-slate-900 block mb-1">Assessment Heuristic:</span>
            Low risk indicates routine events such as couriers or resident pickups. High risk alerts highlight car tampering, door checking, or lingering in darkness.
          </div>
        </div>
      </div>

      {/* Recent Activity Timeline */}
      <div className="p-8 rounded-3xl bg-white border-2 border-slate-200 shadow-subtle space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <h2 className="text-xl font-extrabold text-slate-950 tracking-tight">Recent Analysis Activity</h2>
          <span className="text-sm font-bold text-slate-500">Chronological Telemetry</span>
        </div>

        {stats?.recent_activity && stats.recent_activity.length > 0 ? (
          <div className="divide-y divide-slate-200">
            {stats.recent_activity.map((item, idx) => (
              <div key={idx} className="py-4 flex items-center justify-between gap-5 text-sm">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${item.risk === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'}`}>
                    {item.risk === 'high' ? <AlertTriangle className="w-5 h-5 stroke-[2.5]" /> : <ShieldCheck className="w-5 h-5 stroke-[2.5]" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-950">{item.file_name}</h3>
                    <p className="text-slate-600 text-sm font-medium line-clamp-1">{item.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {new Date(item.analyzed_at || item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <Link
                    to={`/analysis/${encodeURIComponent(item.clip_id)}`}
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-950 hover:bg-slate-100 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-center text-sm font-semibold text-slate-500">
            No recent analyses recorded. Select videos in the library to run the AI engine.
          </div>
        )}
      </div>
    </div>
  );
};
