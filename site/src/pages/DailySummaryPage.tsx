import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  ShieldAlert, 
  ShieldCheck, 
  Package, 
  UserCheck, 
  Filter, 
  Play, 
  Clock, 
  ExternalLink, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { DailySummaryItem } from '../types';

export const DailySummaryPage: React.FC = () => {
  const [summaries, setSummaries] = useState<DailySummaryItem[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSummaries();
  }, [selectedDate, selectedRisk]);

  const loadSummaries = () => {
    setIsLoading(true);
    api.getDailySummaries(selectedDate, selectedRisk)
      .then((res) => {
        setSummaries(res.summaries);
        setAvailableDates(res.available_dates);
      })
      .catch((err) => console.error('Failed to load daily summaries:', err))
      .finally(() => setIsLoading(false));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="text-emerald-600" size={24} />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Daily Intelligence Summary
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Chronological plain-English activity digest with prioritized high-risk alerts and package tracking
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold">
            <Filter size={14} className="text-slate-400" />
            <span className="text-slate-500">Date:</span>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">All Dates ({availableDates.length})</option>
              {availableDates.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold">
            <span className="text-slate-500">Severity:</span>
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">All Risks</option>
              <option value="high">High Risk Only</option>
              <option value="low">Low Risk Only</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400 font-medium text-sm">
          Generating daily event digests...
        </div>
      ) : summaries.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
          <Calendar size={36} className="mx-auto mb-3 text-slate-300" />
          <h3 className="text-base font-bold text-slate-800">No Events Found for Selected Filters</h3>
          <p className="text-xs text-slate-500 mt-1">Try resetting the date or severity dropdowns above.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {summaries.map((day) => (
            <div 
              key={day.date}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              {/* Daily Header Banner */}
              <div className="p-6 bg-gradient-to-r from-slate-50 to-emerald-50/40 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      {day.date}
                    </h2>
                    <span className="bg-slate-200/80 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                      {day.total_events} Event{day.total_events !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 mt-2 font-medium leading-relaxed max-w-3xl">
                    {day.plain_english_summary}
                  </p>
                </div>

                {/* Day Stat Badges */}
                <div className="flex items-center gap-3 shrink-0">
                  {day.high_risk_count > 0 && (
                    <div className="px-3 py-1.5 bg-rose-100 border border-rose-300 rounded-xl text-rose-800 text-xs font-black flex items-center gap-1.5">
                      <ShieldAlert size={16} />
                      <span>{day.high_risk_count} High Risk</span>
                    </div>
                  )}
                  {day.delivery_count > 0 && (
                    <div className="px-3 py-1.5 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                      <Package size={16} />
                      <span>{day.delivery_count} Deliveries</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Event Cards inside this Day */}
              <div className="p-6 divide-y divide-slate-100">
                {day.events.map((ev) => {
                  const isHigh = ev.risk === 'high';
                  return (
                    <div 
                      key={`${day.date}_${ev.clip_id}`}
                      className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-2.5 rounded-xl shrink-0 ${
                          isHigh ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isHigh ? <ShieldAlert size={20} /> : <Package size={20} />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              {ev.category}
                            </span>
                            <span className="text-xs font-mono text-slate-400">
                              [{ev.clip_id}]
                            </span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                              isHigh 
                                ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {ev.risk}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 mt-1 leading-normal">
                            {ev.description}
                          </p>

                          {ev.riskEvidence && isHigh && (
                            <p className="text-[11px] text-rose-700 font-semibold mt-1">
                              Evidence: {ev.riskEvidence}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Link */}
                      <div className="flex items-center gap-3 shrink-0 pl-12 md:pl-0">
                        <Link
                          to={`/analysis/${ev.clip_id}`}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                        >
                          <Play size={14} fill="currentColor" />
                          <span>View Clip</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
