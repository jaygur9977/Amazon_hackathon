import React, { useState, useEffect, useRef } from 'react';
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
  RotateCw,
  Sparkles,
  Layers,
  Send,
  Bot,
  MessageSquare,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Film
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { DailySummaryItem, ChatMessage, RAGCitation } from '../types';

export const DailySummaryPage: React.FC = () => {
  const [summaries, setSummaries] = useState<DailySummaryItem[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // General-Purpose Assistant below Daily Summary state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'I am your AegisVision Video Intelligence Assistant. You can ask me any question about the daily surveillance digests, security events, package tracking, or specific camera clips above.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    'Summarize the most important high-risk events.',
    'Which clips contain a possible package removal?',
    'What happened at 00:08 in delivery-03.mp4?',
    'Why was theft-03 marked as high risk?',
    'What evidence is available about the visitor actions?'
  ];

  useEffect(() => {
    loadSummaries();
  }, [selectedDate, selectedRisk]);

  const loadSummaries = () => {
    setIsLoading(true);
    setError(null);
    api.getDailySummaries(selectedDate, selectedRisk)
      .then((res) => {
        setSummaries(res.summaries || []);
        setAvailableDates(res.available_dates || []);
      })
      .catch((err) => {
        console.error('Failed to load daily summaries:', err);
        setError(err.message || 'Failed to load daily summaries from storage.');
      })
      .finally(() => setIsLoading(false));
  };

  const handleSendChat = async (promptText?: string) => {
    const textToSend = promptText || chatInput.trim();
    if (!textToSend || isAsking) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsAsking(true);

    try {
      const res = await api.askAssistant(textToSend, chatMessages);
      const assistantMsg: ChatMessage = {
        id: `ast_${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: res.citations,
        model: res.model,
        grounded: res.grounded,
        notice: res.notice
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ Query error: ${err.message || 'Unable to connect to assistant service.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAsking(false);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 shadow-sm">
              <Calendar size={22} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Daily Intelligence Summary
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Deterministic activity digest from stored event records with prioritized high-risk alerts & timeline
              </p>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold">
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

          <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold">
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

      {/* Loading Skeleton State */}
      {isLoading ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-4 animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-1/4"></div>
            <div className="h-4 bg-slate-100 rounded w-3/4"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
              <div className="h-20 bg-slate-100 rounded-xl"></div>
              <div className="h-20 bg-slate-100 rounded-xl"></div>
              <div className="h-20 bg-slate-100 rounded-xl"></div>
              <div className="h-20 bg-slate-100 rounded-xl"></div>
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-8 text-center space-y-4">
          <AlertCircle size={36} className="mx-auto text-rose-600" />
          <div>
            <h3 className="text-base font-bold text-rose-900">Failed to Load Daily Summary</h3>
            <p className="text-xs text-rose-700 mt-1">{error}</p>
          </div>
          <button
            onClick={loadSummaries}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm inline-flex items-center gap-2"
          >
            <RotateCw size={14} />
            <span>Retry Loading</span>
          </button>
        </div>
      ) : summaries.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <Calendar size={36} className="mx-auto text-slate-300" />
          <h3 className="text-base font-bold text-slate-800">No Surveillance Events Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No stored records matched date "{selectedDate}" and risk "{selectedRisk}".
          </p>
          <button
            onClick={() => { setSelectedDate('all'); setSelectedRisk('all'); }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {summaries.map((day) => {
            const highEvents = day.high_risk_events || day.events.filter((e) => e.risk === 'high');
            const timelineEvents = day.chronological_timeline || day.events;
            const categories = day.category_breakdown || [];

            return (
              <div 
                key={day.date}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* SECTION A: Daily Header & Overview */}
                <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-50 via-emerald-50/20 to-slate-50 border-b border-slate-200">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                          {day.date}
                        </h2>
                        <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-extrabold px-3 py-1 rounded-full">
                          {day.total_events} Total Event{day.total_events !== 1 ? 's' : ''}
                        </span>
                        {day.unique_clips_count && (
                          <span className="bg-slate-200/80 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-full">
                            {day.unique_clips_count} Unique Clip{day.unique_clips_count !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stat Badges */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      {day.high_risk_count > 0 ? (
                        <div className="px-3 py-1.5 bg-rose-100 border border-rose-300 rounded-xl text-rose-800 text-xs font-black flex items-center gap-1.5">
                          <ShieldAlert size={15} />
                          <span>{day.high_risk_count} High Risk</span>
                        </div>
                      ) : (
                        <div className="px-3 py-1.5 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                          <ShieldCheck size={15} />
                          <span>0 High Risk</span>
                        </div>
                      )}
                      {day.delivery_count > 0 && (
                        <div className="px-3 py-1.5 bg-blue-100 border border-blue-300 rounded-xl text-blue-800 text-xs font-bold flex items-center gap-1.5">
                          <Package size={15} />
                          <span>{day.delivery_count} Deliveries</span>
                        </div>
                      )}
                      {day.visitor_count > 0 && (
                        <div className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-xl text-slate-700 text-xs font-bold flex items-center gap-1.5">
                          <UserCheck size={15} />
                          <span>{day.visitor_count} Visitors</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SECTION E: Plain-English Daily Narrative */}
                  <div className="mt-5 p-4 rounded-2xl bg-white border border-slate-200 shadow-subtle">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      <Sparkles size={14} className="text-emerald-600" />
                      <span>Deterministic Activity Narrative</span>
                    </div>
                    <p className="text-sm text-slate-800 font-medium leading-relaxed">
                      {day.plain_english_summary}
                    </p>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-8">
                  {/* SECTION C: High-Risk Security Incidents */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <ShieldAlert size={16} className="text-rose-600" />
                        <span>High-Risk Security Alerts ({highEvents.length})</span>
                      </h3>
                      <span className="text-[11px] font-bold text-slate-400">Strictly Stored Risk Classifications</span>
                    </div>

                    {highEvents.length === 0 ? (
                      <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2.5">
                        <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                        <span>No high-risk security threats or perimeter breaches recorded for this date.</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {highEvents.map((ev) => (
                          <div 
                            key={`high_${ev.clip_id}`}
                            className="p-4 rounded-2xl bg-rose-50/50 border-2 border-rose-200/90 hover:border-rose-300 transition space-y-2.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-extrabold text-rose-900 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-300">
                                  [{ev.clip_id}]
                                </span>
                                <span className="text-xs font-bold text-slate-900">
                                  {ev.category}
                                </span>
                              </div>
                              <span className="text-[11px] font-mono text-slate-500 font-semibold">
                                {ev.time_formatted}
                              </span>
                            </div>

                            <p className="text-xs text-slate-700 leading-normal">
                              {ev.description}
                            </p>

                            {ev.riskEvidence && (
                              <div className="text-[11px] font-semibold text-rose-800 bg-rose-100/80 px-2.5 py-1.5 rounded-lg border border-rose-200/60">
                                <strong>Evidence:</strong> {ev.riskEvidence}
                              </div>
                            )}

                            <div className="pt-1 flex items-center justify-end">
                              <Link
                                to={`/analysis/${encodeURIComponent(ev.clip_id)}`}
                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                              >
                                <Play size={12} fill="currentColor" />
                                <span>Inspect Incident</span>
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SECTION B: Event-Type Breakdown */}
                  {categories.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <Layers size={16} className="text-emerald-600" />
                        <span>Event Category Breakdown</span>
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {categories.map((cat) => (
                          <div 
                            key={cat.category}
                            className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-slate-900">
                                {cat.category}
                              </span>
                              <span className="text-xs font-bold bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-700">
                                {cat.count} clip{cat.count !== 1 ? 's' : ''}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              {cat.clips.map((c) => (
                                <Link
                                  key={c.clip_id}
                                  to={`/analysis/${encodeURIComponent(c.clip_id)}`}
                                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border transition ${
                                    c.risk === 'high'
                                      ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                  }`}
                                  title={`Open ${c.file_name}`}
                                >
                                  {c.clip_id}
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SECTION D: Chronological Event Timeline */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <Clock size={16} className="text-slate-600" />
                      <span>Chronological Timeline Progression ({timelineEvents.length} events)</span>
                    </h3>

                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                      {timelineEvents.map((ev) => {
                        const isHigh = ev.risk === 'high';
                        return (
                          <div 
                            key={`tl_${ev.clip_id}_${ev.timestamp}`}
                            className="p-4 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                          >
                            <div className="flex items-start gap-3.5">
                              <div className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg shrink-0 border border-slate-200">
                                {ev.time_formatted}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900">
                                    {ev.category}
                                  </span>
                                  <span className="font-mono text-xs text-slate-400">
                                    [{ev.clip_id}]
                                  </span>
                                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                    isHigh 
                                      ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}>
                                    {ev.risk}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600 mt-1 leading-normal">
                                  {ev.description}
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center justify-end pl-10 sm:pl-0">
                              <Link
                                to={`/analysis/${encodeURIComponent(ev.clip_id)}`}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                              >
                                <Play size={12} fill="currentColor" />
                                <span>View Clip</span>
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SECTION 6: General-Purpose AI Assistant (Below the Daily Summary Page) */}
      <div className="mt-12 bg-white rounded-3xl border-2 border-slate-200 shadow-sm overflow-hidden">
        {/* Assistant Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Bot size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-tight">
                  AegisVision AI Assistant
                </h3>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Grounded RAG
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-medium">
                Ask specific questions about the daily events, video clips, timestamps, or risk telemetry above
              </p>
            </div>
          </div>

          <Link
            to="/assistant"
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 self-start sm:self-auto"
          >
            <ExternalLink size={13} />
            <span>Full-Screen Assistant</span>
          </Link>
        </div>

        {/* Suggested Prompt Pills */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <HelpCircle size={13} className="text-emerald-600" /> Prompts:
          </span>
          {suggestedQuestions.map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSendChat(q)}
              disabled={isAsking}
              className="shrink-0 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:border-emerald-500 hover:bg-emerald-50/50 transition font-medium text-xs disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat Messages Container */}
        <div className="p-6 max-h-96 overflow-y-auto space-y-4 bg-slate-50/50">
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}
            >
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 px-1">
                <span>{msg.sender === 'user' ? 'You' : 'AegisVision AI Assistant'}</span>
                <span>•</span>
                <span className="font-mono">{msg.timestamp}</span>
              </div>

              <div
                className={`p-4 rounded-2xl max-w-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-none font-medium'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {msg.model && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Model: {msg.model}</span>
                    <span className="text-emerald-600 font-semibold">Grounded in verified telemetry</span>
                  </div>
                )}
              </div>

              {/* Citations */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="max-w-2xl w-full p-3 rounded-xl bg-white border border-emerald-200/80 shadow-subtle space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800">
                    <span className="flex items-center gap-1.5">
                      <Film size={13} className="text-emerald-600" />
                      <span>Evidence Citations ({msg.citations.length} clips)</span>
                    </span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                      Verified
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {msg.citations.slice(0, 4).map((cit, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate" title={cit.file_name}>
                            {cit.file_name}
                          </p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            cit.risk === 'high' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {cit.risk} risk
                          </span>
                        </div>
                        <Link
                          to={`/analysis/${encodeURIComponent(cit.clip_id)}`}
                          className="p-1 rounded hover:bg-slate-200 text-slate-600 transition"
                          title="Open clip analysis"
                        >
                          <ExternalLink size={13} />
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isAsking && (
            <div className="flex items-center gap-2.5 text-xs text-slate-500">
              <RotateCw size={15} className="animate-spin text-emerald-600" />
              <span>AegisVision AI is synthesizing answer from video telemetry...</span>
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Question Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendChat();
          }}
          className="p-4 bg-white border-t border-slate-200 flex items-center gap-2.5"
        >
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={isAsking}
            placeholder="Ask a question about your daily surveillance events (e.g. 'Why was theft-03 marked high risk?')..."
            className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          />
          <button
            type="submit"
            disabled={isAsking || !chatInput.trim()}
            className="px-5 py-3 rounded-2xl bg-emerald-600 text-white text-xs sm:text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition flex items-center gap-2 shadow-sm shrink-0"
          >
            <span>Ask AI</span>
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
};
